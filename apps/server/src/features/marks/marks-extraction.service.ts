import { marksService } from './marks.service';
import { entryTableQuerySchema } from './marks.validation';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { openaiWhisperProvider } from '../ai/providers/stt/openai-whisper.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { ComponentStatus, IComponentScore } from './marks.model';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';

// ── Output shapes ─────────────────────────────────────────────────────────────

export interface ExtractedMarksRow {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  componentScores: IComponentScore[];
}

export interface UnmatchedExtraction {
  rawName?: string;
  rawRollNumber?: string;
  scores: Record<string, number>;
}

export interface MarksExtractionResult {
  source: 'image' | 'voice';
  extracted: ExtractedMarksRow[];
  unmatched: UnmatchedExtraction[];
  warnings: string[];
  transcript?: string;
}

// ── Raw shape the model is asked to return ─────────────────────────────────────

interface RawExtractedEntry {
  rollNumber?: string | null;
  name?: string | null;
  absent?: boolean;
  scores?: Record<string, number | string | null>;
}

// ── Prompt building ────────────────────────────────────────────────────────────

function buildSystemPrompt(components: { name: string; maxMarks: number }[]): string {
  return `You read a teacher's handwritten or dictated student marks and convert them into structured JSON.

The exam has these components (score out of, in brackets): ${components.map((c) => `"${c.name}" (max ${c.maxMarks})`).join(', ')}.

For each student you can identify, return one entry with:
- "rollNumber": the student's roll number if visible/mentioned, else null
- "name": the student's name if visible/mentioned, else null
- "absent": true only if explicitly marked absent, else false
- "scores": an object mapping each component name to the numeric score given (omit components not mentioned)

Return ONLY a valid JSON object: {"entries": [...]}. No markdown, no explanation. If you cannot confidently read a value, omit that field rather than guessing.`;
}

function parseEntries(raw: string): RawExtractedEntry[] {
  try {
    const body = JSON.parse(raw);
    const entries = Array.isArray(body) ? body : body.entries;
    if (!Array.isArray(entries)) return [];
    return entries;
  } catch (err) {
    logger.error('[MarksExtraction] Failed to parse AI response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read a result from the AI — try a clearer photo or recording.');
  }
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Handwriting/OCR misreads a letter or two often enough (e.g. "DWIVEDI" ->
// "DWIWEDI") that a strict equality match would push otherwise-obvious
// matches into the unmatched pile. A short edit-distance tolerance recovers
// those without risking cross-matching genuinely different students.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function findClosestName(
  nameKey: string,
  byName: Map<string, { studentId: string; fullName: string; rollNumber?: string }>,
): { studentId: string; fullName: string; rollNumber?: string } | undefined {
  const maxDistance = nameKey.length <= 8 ? 1 : 2;
  let best: { studentId: string; fullName: string; rollNumber?: string } | undefined;
  let bestDistance = maxDistance + 1;
  for (const [candidateKey, student] of byName) {
    const distance = levenshtein(nameKey, candidateKey);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = student;
    }
  }
  return bestDistance <= maxDistance ? best : undefined;
}

// ── Matching + score reconciliation ────────────────────────────────────────────

function reconcile(
  entries: RawExtractedEntry[],
  roster: { studentId: string; fullName: string; rollNumber?: string }[],
  components: { name: string; maxMarks: number }[],
): { extracted: ExtractedMarksRow[]; unmatched: UnmatchedExtraction[]; warnings: string[] } {
  const byRoll = new Map(roster.filter((r) => r.rollNumber).map((r) => [normalize(r.rollNumber!), r]));
  const byName = new Map(roster.map((r) => [normalize(r.fullName), r]));
  const maxByComponent = new Map(components.map((c) => [c.name, c.maxMarks]));
  const validComponentNames = new Set(components.map((c) => c.name));

  const extracted: ExtractedMarksRow[] = [];
  const unmatched: UnmatchedExtraction[] = [];
  const warnings: string[] = [];

  for (const entry of entries) {
    const rollKey = entry.rollNumber ? normalize(String(entry.rollNumber)) : undefined;
    const nameKey = entry.name ? normalize(entry.name) : undefined;
    const student = (rollKey && byRoll.get(rollKey))
      || (nameKey && byName.get(nameKey))
      || (nameKey && findClosestName(nameKey, byName));

    const cleanScores: Record<string, number> = {};
    for (const [componentName, value] of Object.entries(entry.scores ?? {})) {
      if (!validComponentNames.has(componentName)) continue;
      const num = typeof value === 'string' ? Number(value) : value;
      if (typeof num !== 'number' || Number.isNaN(num)) continue;
      const max = maxByComponent.get(componentName) ?? 0;
      if (num > max) {
        warnings.push(`${entry.name ?? entry.rollNumber ?? 'A student'}: ${componentName} read as ${num}, exceeds max ${max} — capped, please verify.`);
        cleanScores[componentName] = max;
      } else {
        cleanScores[componentName] = num;
      }
    }

    if (!student) {
      if (Object.keys(cleanScores).length > 0 || entry.name || entry.rollNumber) {
        unmatched.push({
          rawName: entry.name ?? undefined,
          rawRollNumber: entry.rollNumber ?? undefined,
          scores: cleanScores,
        });
      }
      continue;
    }

    const status: ComponentStatus = entry.absent ? 'absent' : 'present';
    extracted.push({
      studentId: student.studentId,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      componentScores: components.map((c) => ({
        componentName: c.name,
        score: status === 'present' ? cleanScores[c.name] : undefined,
        status,
      })),
    });
  }

  return { extracted, unmatched, warnings };
}

// ── Service ────────────────────────────────────────────────────────────────────

export const marksExtractionService = {
  async extractFromImage(
    rawQuery: unknown,
    imageDataUri: string,
    ctx: AuthContext,
  ): Promise<MarksExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    const target = entryTableQuerySchema.parse(rawQuery);
    const table = await marksService.getEntryTable(target, ctx); // also enforces teacher scope

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(table.exam.components),
      userPrompt: 'Read the marks sheet in this photo and extract every student you can identify.',
      imageDataUri,
      temperature: 0.1,
      maxTokens: 2000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const entries = parseEntries(result.content);
    const roster = table.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, rollNumber: r.rollNumber }));
    const { extracted, unmatched, warnings } = reconcile(entries, roster, table.exam.components);

    return { source: 'image', extracted, unmatched, warnings };
  },

  async extractFromVoice(
    rawQuery: unknown,
    audio: { buffer: Buffer; mimetype: string; filename: string },
    ctx: AuthContext,
  ): Promise<MarksExtractionResult> {
    if (!openaiProvider.isAvailable() || !openaiWhisperProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    const target = entryTableQuerySchema.parse(rawQuery);
    const table = await marksService.getEntryTable(target, ctx); // also enforces teacher scope

    const { text: transcript } = await openaiWhisperProvider.transcribe(audio);
    if (!transcript.trim()) {
      throw new ValidationError('Could not hear anything in that recording — try again in a quieter spot.');
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(table.exam.components),
      userPrompt: `Dictated by the teacher:\n"${transcript}"`,
      temperature: 0.1,
      maxTokens: 2000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const entries = parseEntries(result.content);
    const roster = table.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, rollNumber: r.rollNumber }));
    const { extracted, unmatched, warnings } = reconcile(entries, roster, table.exam.components);

    return { source: 'voice', extracted, unmatched, warnings, transcript };
  },

  /**
   * Same as extractFromVoice but skips Whisper entirely — used for the live
   * in-browser dictation flow, where the transcript already comes from the
   * Web Speech API as the teacher talks (English/Latin script by construction).
   */
  async extractFromTranscript(
    rawQuery: unknown,
    transcript: string,
    ctx: AuthContext,
  ): Promise<MarksExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }
    if (!transcript.trim()) {
      throw new ValidationError('Could not hear anything yet — keep dictating.');
    }
    const target = entryTableQuerySchema.parse(rawQuery);
    const table = await marksService.getEntryTable(target, ctx); // also enforces teacher scope

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(table.exam.components),
      userPrompt: `Dictated by the teacher:\n"${transcript}"`,
      temperature: 0.1,
      maxTokens: 2000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const entries = parseEntries(result.content);
    const roster = table.rows.map((r) => ({ studentId: r.studentId, fullName: r.fullName, rollNumber: r.rollNumber }));
    const { extracted, unmatched, warnings } = reconcile(entries, roster, table.exam.components);

    return { source: 'voice', extracted, unmatched, warnings, transcript };
  },
};
