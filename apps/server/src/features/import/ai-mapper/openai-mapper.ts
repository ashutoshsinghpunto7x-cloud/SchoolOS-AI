import { openaiProvider, estimateCost } from '../../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../../ai/ai.repository';
import { getTemplate } from '../templates/template.registry';
import { ImportType } from '../import-session.model';
import { ColumnMappingRequest, ColumnMappingSuggestion, IAIMapper } from './ai-mapper.interface';
import { logger } from '../../../lib/logger';

interface RawSuggestion {
  sourceColumn: string;
  suggestedField: string | null;
  confidence: number;
}

/**
 * AI-assisted column mapping, backed by the same OpenAI provider already used
 * for transcript analysis (see ai.service.ts's _analyzeTranscript). Only ever
 * invoked when the user clicks "AI Auto Map" for columns the heuristic mapper
 * left unresolved — never runs automatically, and never imports anything on
 * its own; suggestions still require the user's confirmation on the mapping
 * screen (confidence < 80% is forced to manual review there).
 */
export class OpenAiMapper implements IAIMapper {
  async suggestMappings(request: ColumnMappingRequest, schoolId = 'system'): Promise<ColumnMappingSuggestion[]> {
    if (!openaiProvider.isAvailable()) {
      throw new Error('AI mapping is not configured on this server.');
    }

    const expectedFields = getTemplate(request.importType as ImportType).headers;
    const start = Date.now();

    const result = await openaiProvider.complete({
      systemPrompt: `You map spreadsheet column headers from a school's data export onto a fixed set of target field names.

Target fields (choose ONLY from this list, or null if nothing fits): ${expectedFields.join(', ')}

For each uploaded column, decide which target field it represents. Use the sample values as context — e.g. a column of phone-number-shaped values is more likely "parentPhone" than "address".

Return ONLY a valid JSON array, one object per uploaded column, each shaped exactly as:
{"sourceColumn": "<uploaded header>", "suggestedField": "<one of the target fields, or null>", "confidence": <number 0 to 1>}

No markdown, no explanation, no extra keys.`,
      userPrompt: `Uploaded columns with sample values:\n${JSON.stringify(
        request.sourceColumns.map((col) => ({
          column: col,
          samples: request.sampleRows.map((r) => r[col]).filter((v) => v !== undefined && v !== ''),
        })),
        null,
        2,
      )}`,
      temperature: 0.1,
      maxTokens: 800,
      jsonResponse: true,
    });

    const durationMs = Date.now() - start;

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs,
      schoolId,
    });

    let parsed: RawSuggestion[];
    try {
      const body = JSON.parse(result.content);
      parsed = Array.isArray(body) ? body : (body.mappings ?? body.suggestions ?? []);
    } catch (err) {
      logger.error('[OpenAiMapper] Failed to parse AI mapping response', { error: String(err), raw: result.content.slice(0, 500) });
      throw new Error('AI mapping returned an unreadable response. Try mapping manually.');
    }

    const byColumn = new Map(parsed.map((s) => [s.sourceColumn, s]));

    return request.sourceColumns.map((col) => {
      const suggestion = byColumn.get(col);
      const suggestedField = suggestion?.suggestedField && expectedFields.includes(suggestion.suggestedField)
        ? suggestion.suggestedField
        : null;
      const confidence = suggestedField && typeof suggestion?.confidence === 'number'
        ? Math.max(0, Math.min(1, suggestion.confidence))
        : 0;

      return {
        sourceColumn: col,
        suggestedField,
        confidence,
        fieldLabel: suggestedField ?? col,
        requiresConfirmation: !suggestedField || confidence < 0.8,
      };
    });
  }
}
