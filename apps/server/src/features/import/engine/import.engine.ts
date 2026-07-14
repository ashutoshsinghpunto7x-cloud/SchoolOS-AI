import { AuthContext } from '../../../lib/auth-context';
import { logger } from '../../../lib/logger';
import { ImportType, ImportRowStatus, IImportSession, IDetectedClass } from '../import-session.model';
import { importSessionRepository, importRowRepository } from '../import-session.repository';
import { ParsedRow } from '../parsers/parser.interface';
import { getValidator } from '../validators/validator.registry';
import { getProcessor } from '../processors/processor.registry';
import { IProcessor } from '../processors/processor.interface';
import { HeuristicMapper, ColumnMappingSuggestion } from '../ai-mapper/ai-mapper.interface';
import { OpenAiMapper } from '../ai-mapper/openai-mapper';
import { schoolClassRepository } from '../../school-classes/school-class.repository';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 50; // breathing room for small VPS

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Column mapping ────────────────────────────────────────────────────────────

/**
 * Build the column mapping for a session.
 * Uses the HeuristicMapper for now; swap for IAIMapper implementation when ready.
 */
export const buildColumnMapping = async (
  importType: ImportType,
  headers: string[],
  sampleRows: ParsedRow[]
): Promise<Record<string, string>> => {
  const mapper = new HeuristicMapper();
  const suggestions = await mapper.suggestMappings({
    importType,
    sourceColumns: headers,
    sampleRows: sampleRows.slice(0, 3).map((r) => r.data),
  });

  const mapping: Record<string, string> = {};
  for (const s of suggestions) {
    if (s.suggestedField) {
      mapping[s.sourceColumn] = s.suggestedField;
    }
  }
  return mapping;
};

/**
 * AI-assisted mapping for columns the heuristic mapper couldn't resolve.
 * Only called from the explicit "AI Auto Map" action (never automatically)
 * and never writes anything — the caller shows suggestions for the user to
 * confirm/edit, then saves via the normal updateMapping flow.
 */
export const buildAIColumnMapping = async (
  importType: ImportType,
  unmappedHeaders: string[],
  sampleRows: ParsedRow[],
  schoolId: string
): Promise<ColumnMappingSuggestion[]> => {
  const mapper = new OpenAiMapper();
  return mapper.suggestMappings(
    {
      importType,
      sourceColumns: unmappedHeaders,
      sampleRows: sampleRows.slice(0, 3).map((r) => r.data),
    },
    schoolId,
  );
};

// ── Apply mapping to a raw row ────────────────────────────────────────────────

const applyMapping = (
  rawData: Record<string, unknown>,
  mapping: Record<string, string>
): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {};
  for (const [sourceCol, schemaField] of Object.entries(mapping)) {
    if (rawData[sourceCol] !== undefined) {
      mapped[schemaField] = rawData[sourceCol];
    }
  }
  // Also pass through any columns that weren't mapped (validator will reject unknown fields)
  for (const [key, val] of Object.entries(rawData)) {
    if (!(key in mapping)) {
      mapped[key] = val; // pass-through unmapped columns as-is
    }
  }
  return mapped;
};

// ── Validate all rows ─────────────────────────────────────────────────────────

/** For 'students' imports, finds every class/section combo among the successfully
 * validated rows that isn't already in this school's Classes & Sections catalog —
 * surfaced at preview time so the accountant can catch typos before they become
 * permanent catalog entries, instead of silently creating them. */
async function detectNewClasses(
  schoolId: string,
  importType: ImportType,
  cleanRows: Record<string, unknown>[],
): Promise<IDetectedClass[]> {
  if (importType !== 'students') return [];

  const distinct = new Map<string, { class: string; section: string }>();
  for (const data of cleanRows) {
    const klass = typeof data.class === 'string' ? data.class.trim() : '';
    const section = typeof data.section === 'string' ? data.section.trim() : '';
    if (!klass || !section) continue;
    distinct.set(`${klass.toLowerCase()}||${section.toLowerCase()}`, { class: klass, section });
  }
  if (!distinct.size) return [];

  const existingClasses = await schoolClassRepository.findAll(schoolId);
  const detected: IDetectedClass[] = [];
  for (const { class: klass, section } of distinct.values()) {
    const existing = existingClasses.find((c) => c.name.toLowerCase() === klass.toLowerCase());
    const sectionExists = !!existing?.sections.some((s) => s.toLowerCase() === section.toLowerCase());
    if (!existing || !sectionExists) {
      detected.push({ class: klass, section, classExists: !!existing });
    }
  }
  return detected;
}

export const validateRows = async (
  sessionId: string,
  schoolId: string,
  importType: ImportType,
  rows: ParsedRow[],
  mapping: Record<string, string>
): Promise<{ validRows: number; warningRows: number; failedRows: number; duplicateRows: number; detectedNewClasses: IDetectedClass[] }> => {
  const validator = getValidator(importType);
  const processor = getProcessor(importType);
  let validRows = 0;
  let warningRows = 0;
  let failedRows = 0;
  let duplicateRows = 0;
  const cleanRows: Record<string, unknown>[] = [];

  const rowDocs = await Promise.all(rows.map(async (row) => {
    const mappedData = applyMapping(row.data, mapping);
    const result = validator.validate(mappedData);

    if (result.status === 'valid') validRows++;
    else if (result.status === 'warning') warningRows++;
    else failedRows++;

    // Store the validator's cleaned/coerced data (not the raw mapped data) so the
    // business service — which re-validates strictly — sees the normalized shape
    // (lowercased gender, tags array, inferred section, etc). Using raw mappedData
    // here caused valid/warning rows to fail silently during processing.
    const persistedData = result.status === 'error' ? mappedData : result.cleanData;
    if (result.status !== 'error') cleanRows.push(persistedData);

    // Duplicate check is read-only and only meaningful for rows that will
    // actually be processed — skip it for rows already destined to be dropped.
    let duplicateOf: string | undefined;
    if (result.status !== 'error' && processor.findDuplicate) {
      duplicateOf = await processor.findDuplicate(persistedData, schoolId);
      if (duplicateOf) duplicateRows++;
    }

    return {
      rowNumber: row.rowNumber,
      rawData: row.data,
      mappedData: persistedData,
      status: result.status as 'valid' | 'warning' | 'error',
      errors: result.errors,
      warnings: result.warnings,
      duplicateOf,
    };
  }));

  await importRowRepository.bulkCreate({ sessionId, schoolId, rows: rowDocs });

  const detectedNewClasses = await detectNewClasses(schoolId, importType, cleanRows);

  return { validRows, warningRows, failedRows, duplicateRows, detectedNewClasses };
};

// ── Background processing ─────────────────────────────────────────────────────

/**
 * Background import processing.
 * Runs AFTER the user clicks Confirm on the preview screen.
 * Processes rows in batches; each batch delegates to the business service.
 *
 * Architecture notes:
 * - Runs as a detached async chain (fire-and-forget from HTTP handler)
 * - Redis-ready: replace the inner loop with a queue.add() call per batch
 * - Each row result updates ImportRow status independently for retry support
 */
export const runImport = async (
  session: IImportSession,
  ctx: AuthContext
): Promise<void> => {
  const sessionId = session._id.toString();
  const { schoolId, importType } = session;
  const processor = getProcessor(importType);

  logger.info('Import processing started', { sessionId, importType, schoolId });

  await importSessionRepository.pushTimelineEvent(sessionId, schoolId, {
    event: 'processing_started',
    at: new Date(),
  });

  try {
    // Process valid and warning rows as two independent, fully-paginated passes.
    // (Previously these were interleaved in one loop that broke out as soon as a
    // page of 'valid' rows came back empty — which meant warning-only imports,
    // e.g. every row needing an inferred section, never processed a single row.)
    await processRowsByStatus(sessionId, schoolId, processor, 'valid', ctx);
    await processRowsByStatus(sessionId, schoolId, processor, 'warning', ctx);

    // Final stats
    const counts = await importRowRepository.countByStatus(sessionId);
    const importedRows = counts['imported'] ?? 0;
    const failedAfterProcess = counts['error'] ?? 0;
    const skippedRows = counts['skipped'] ?? 0;

    await importSessionRepository.updateStatus(sessionId, schoolId, 'completed', {
      importedRows,
      failedRows: failedAfterProcess,
      skippedRows,
      completedAt: new Date(),
    });

    await importSessionRepository.pushTimelineEvent(sessionId, schoolId, {
      event: 'completed',
      at: new Date(),
      note: `${importedRows} records imported, ${skippedRows} skipped, ${failedAfterProcess} failed`,
    });

    logger.info('Import processing completed', { sessionId, importedRows, skippedRows, failedAfterProcess });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown processing error';
    logger.error('Import processing failed', { sessionId, error: message });

    await importSessionRepository.updateStatus(sessionId, schoolId, 'failed', {
      errorSummary: message,
    });

    await importSessionRepository.pushTimelineEvent(sessionId, schoolId, {
      event: 'failed',
      at: new Date(),
      note: message,
    });
  }
};

// ── Rollback ──────────────────────────────────────────────────────────────────

/**
 * Rollback: soft-delete all records created during this import session.
 * Business modules handle their own rollback via the processor's rollbackRow method.
 */
export const rollbackImport = async (
  session: IImportSession,
  ctx: AuthContext
): Promise<void> => {
  const sessionId = session._id.toString();
  const { schoolId, importType, importedIds } = session;
  const processor = getProcessor(importType);

  logger.info('Import rollback started', { sessionId, count: importedIds.length });

  // Rollback in parallel batches
  const chunks = chunkArray(importedIds, BATCH_SIZE);
  for (const chunk of chunks) {
    await Promise.all(chunk.map((id) => processor.rollbackRow(id, ctx)));
    await sleep(BATCH_DELAY_MS);
  }

  await importSessionRepository.updateStatus(sessionId, schoolId, 'rolled_back', {
    rolledBackAt: new Date(),
  });

  await importSessionRepository.pushTimelineEvent(sessionId, schoolId, {
    event: 'rolled_back',
    at: new Date(),
    note: `${importedIds.length} records removed`,
  });

  logger.info('Import rollback completed', { sessionId });
};

/**
 * Process every row of a given status for a session, fully paginated.
 * Kept as its own loop per status so an empty/short page of one status can
 * never short-circuit processing of the other.
 */
const processRowsByStatus = async (
  sessionId: string,
  schoolId: string,
  processor: IProcessor,
  status: ImportRowStatus,
  ctx: AuthContext
): Promise<void> => {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: rows, meta } = await importRowRepository.findBySession(sessionId, {
      page,
      limit: BATCH_SIZE,
      status,
    });

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    await Promise.all(
      rows.map(async (row) => {
        const duplicateAction = row.duplicateOf ? (row.duplicateAction ?? 'update') : undefined;
        const result = await processor.processRow(row.mappedData, ctx, duplicateAction);

        if (result.success && result.skipped) {
          await importRowRepository.updateRowStatus(sessionId, row.rowNumber, 'skipped', result.recordId);
          return;
        }

        if (result.success && result.recordId) {
          const tasks = [
            importRowRepository.updateRowStatus(sessionId, row.rowNumber, 'imported', result.recordId),
            importSessionRepository.incrementImportedRows(sessionId, schoolId),
          ];
          // Never track pre-existing (updated) records for rollback deletion.
          if (!result.isUpdate) tasks.push(importSessionRepository.appendImportedId(sessionId, schoolId, result.recordId));
          await Promise.all(tasks);
        } else {
          await importRowRepository.updateRowStatus(sessionId, row.rowNumber, 'error', undefined, result.error);
        }
      })
    );

    hasMore = meta.page * meta.limit < meta.total;
    page++;

    if (hasMore) await sleep(BATCH_DELAY_MS);
  }
};

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};
