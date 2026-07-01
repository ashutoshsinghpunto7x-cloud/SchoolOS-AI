import { AuthContext } from '../../../lib/auth-context';
import { logger } from '../../../lib/logger';
import { ImportType, IImportSession } from '../import-session.model';
import { importSessionRepository, importRowRepository } from '../import-session.repository';
import { ParsedRow } from '../parsers/parser.interface';
import { getValidator } from '../validators/validator.registry';
import { getProcessor } from '../processors/processor.registry';
import { HeuristicMapper } from '../ai-mapper/ai-mapper.interface';

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

export const validateRows = async (
  sessionId: string,
  schoolId: string,
  importType: ImportType,
  rows: ParsedRow[],
  mapping: Record<string, string>
): Promise<{ validRows: number; warningRows: number; failedRows: number }> => {
  const validator = getValidator(importType);
  let validRows = 0;
  let warningRows = 0;
  let failedRows = 0;

  const rowDocs = rows.map((row) => {
    const mappedData = applyMapping(row.data, mapping);
    const result = validator.validate(mappedData);

    if (result.status === 'valid') validRows++;
    else if (result.status === 'warning') warningRows++;
    else failedRows++;

    return {
      rowNumber: row.rowNumber,
      rawData: row.data,
      mappedData,
      status: result.status as 'valid' | 'warning' | 'error',
      errors: result.errors,
      warnings: result.warnings,
    };
  });

  await importRowRepository.bulkCreate({ sessionId, schoolId, rows: rowDocs });

  return { validRows, warningRows, failedRows };
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
    // Fetch only valid/warning rows (skip errored rows)
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data: rows, meta } = await importRowRepository.findBySession(sessionId, {
        page,
        limit: BATCH_SIZE,
        status: 'valid',
      });

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      // Process batch concurrently within the batch (not across batches)
      await Promise.all(
        rows.map(async (row) => {
          const result = await processor.processRow(row.mappedData, ctx);
          if (result.success && result.recordId) {
            await Promise.all([
              importRowRepository.updateRowStatus(sessionId, row.rowNumber, 'imported', result.recordId),
              importSessionRepository.appendImportedId(sessionId, schoolId, result.recordId),
              importSessionRepository.incrementImportedRows(sessionId, schoolId),
            ]);
          } else {
            await importRowRepository.updateRowStatus(sessionId, row.rowNumber, 'error');
          }
        })
      );

      // Also process warning rows (they passed validation with caveats)
      if (page === 1) {
        const { data: warningRows } = await importRowRepository.findBySession(sessionId, {
          page: 1,
          limit: BATCH_SIZE,
          status: 'warning',
        });

        await Promise.all(
          warningRows.map(async (row) => {
            const result = await processor.processRow(row.mappedData, ctx);
            if (result.success && result.recordId) {
              await Promise.all([
                importRowRepository.updateRowStatus(sessionId, row.rowNumber, 'imported', result.recordId),
                importSessionRepository.appendImportedId(sessionId, schoolId, result.recordId),
                importSessionRepository.incrementImportedRows(sessionId, schoolId),
              ]);
            } else {
              await importRowRepository.updateRowStatus(sessionId, row.rowNumber, 'error');
            }
          })
        );
      }

      hasMore = meta.page * meta.limit < meta.total;
      page++;

      if (hasMore) await sleep(BATCH_DELAY_MS);
    }

    // Final stats
    const counts = await importRowRepository.countByStatus(sessionId);
    const importedRows = counts['imported'] ?? 0;
    const failedAfterProcess = counts['error'] ?? 0;

    await importSessionRepository.updateStatus(sessionId, schoolId, 'completed', {
      importedRows,
      failedRows: failedAfterProcess,
      completedAt: new Date(),
    });

    await importSessionRepository.pushTimelineEvent(sessionId, schoolId, {
      event: 'completed',
      at: new Date(),
      note: `${importedRows} records imported, ${failedAfterProcess} failed`,
    });

    logger.info('Import processing completed', { sessionId, importedRows, failedAfterProcess });
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

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};
