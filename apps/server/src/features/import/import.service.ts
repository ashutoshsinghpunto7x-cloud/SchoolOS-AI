import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import { ImportType, IImportSession } from './import-session.model';
import { importSessionRepository, importRowRepository } from './import-session.repository';
import { importMappingTemplateRepository } from './import-mapping-template.repository';
import { computeHeaderSignature } from './import-mapping-template.model';
import { excelParser } from './parsers/excel.parser';
import { buildColumnMapping, buildAIColumnMapping, validateRows, runImport, rollbackImport } from './engine/import.engine';
import { ColumnMappingSuggestion } from './ai-mapper/ai-mapper.interface';
import {
  listSessionsSchema, listRowsSchema, uploadSessionSchema, confirmMappingSchema, setDuplicateStrategySchema,
  saveMappingTemplateSchema, listMappingTemplatesSchema, updateRowSchema, addRowSchema,
} from './import.validation';
import { listTemplates, generateTemplateBuffer } from './templates/template.registry';
import { schoolClassRepository } from '../school-classes/school-class.repository';
import { getValidator } from './validators/validator.registry';
import { getProcessor } from './processors/processor.registry';

// ── CSV helper ────────────────────────────────────────────────────────────────

/** Quotes a CSV cell only when needed, escaping embedded quotes. */
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// ── Upload & Parse ────────────────────────────────────────────────────────────

export const importService = {
  async upload(
    rawBody: unknown,
    file: { buffer: Buffer; originalname: string; size: number; mimetype: string },
    ctx: AuthContext
  ): Promise<IImportSession> {
    const { importType } = uploadSessionSchema.parse(rawBody);

    // Create session
    const session = await importSessionRepository.create({
      schoolId: ctx.schoolId,
      createdBy: ctx.userId,
      createdByName: ctx.displayName,
      importType,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    const sessionId = session._id.toString();

    try {
      // Parse file
      await importSessionRepository.updateStatus(sessionId, ctx.schoolId, 'parsing');
      const parsed = excelParser.parse(file.buffer, file.mimetype);

      // Priority order: this school's remembered mapping for this exact header
      // shape (from a prior confirmed import) → rule-based heuristics. AI and
      // manual mapping remain available afterward via their own endpoints.
      await importSessionRepository.updateStatus(sessionId, ctx.schoolId, 'validating');
      const headerSignature = computeHeaderSignature(parsed.headers);
      const remembered = await importMappingTemplateRepository.findBySignature(ctx.schoolId, importType, headerSignature);
      const mapping = remembered?.mapping ?? await buildColumnMapping(importType, parsed.headers, parsed.rows);

      // Validate all rows and persist them
      const { validRows, warningRows, failedRows, duplicateRows, detectedNewClasses } = await validateRows(
        sessionId,
        ctx.schoolId,
        importType,
        parsed.rows,
        mapping
      );

      // Update session to preview state
      const updated = await importSessionRepository.updateStatus(sessionId, ctx.schoolId, 'preview', {
        totalRows: parsed.totalRows,
        validRows,
        warningRows,
        failedRows,
        duplicateRows,
        mapping,
        headerSignature,
        detectedNewClasses,
      });

      await importSessionRepository.pushTimelineEvent(sessionId, ctx.schoolId, {
        event: 'validated',
        at: new Date(),
        note: `${validRows} valid, ${warningRows} warnings, ${failedRows} errors`,
      });

      auditService.log({
        userId: ctx.userId,
        userDisplayName: ctx.displayName,
        action: 'import.uploaded',
        resource: 'import_sessions',
        resourceId: sessionId,
        details: { importType, totalRows: parsed.totalRows, validRows, failedRows, fileName: file.originalname },
        ip: ctx.ip,
        schoolId: ctx.schoolId,
      });

      logger.info('Import file parsed and validated', { sessionId, importType, totalRows: parsed.totalRows });
      return updated!;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Parse error';
      await importSessionRepository.updateStatus(sessionId, ctx.schoolId, 'failed', {
        errorSummary: message,
      });
      throw err;
    }
  },

  // ── Update mapping & re-validate ───────────────────────────────────────────

  async updateMapping(id: string, rawBody: unknown, ctx: AuthContext): Promise<IImportSession> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    if (!['preview'].includes(session.status)) {
      throw new ValidationError('Mapping can only be updated in preview state.');
    }

    const { mapping } = confirmMappingSchema.parse(rawBody);

    // Rebuild every row from its stored rawData (persisted per-row at upload time) and
    // re-validate against the new mapping — the original file itself is never kept
    // around, but rawData is, so a full re-validation doesn't need it.
    const existingRows = await importRowRepository.findAllBySession(id);
    const rowsToRevalidate = existingRows.map((r) => ({ rowNumber: r.rowNumber, data: r.rawData }));

    await importRowRepository.deleteBySession(id);

    const { validRows, warningRows, failedRows, duplicateRows, detectedNewClasses } = await validateRows(
      id,
      ctx.schoolId,
      session.importType,
      rowsToRevalidate,
      mapping,
    );

    const updated = await importSessionRepository.updateStatus(id, ctx.schoolId, 'preview', {
      mapping,
      validRows,
      warningRows,
      failedRows,
      duplicateRows,
      detectedNewClasses,
    });

    await importSessionRepository.pushTimelineEvent(id, ctx.schoolId, {
      event: 'validated',
      at: new Date(),
      note: `Mapping updated — ${validRows} valid, ${warningRows} warnings, ${failedRows} errors`,
    });

    return updated!;
  },

  // ── Duplicate resolution ───────────────────────────────────────────────────

  /** Session-wide default for every row that matched an existing record —
   *  set from the preview screen's Skip/Update/Import Anyway selector. */
  async setDuplicateStrategy(id: string, rawBody: unknown, ctx: AuthContext): Promise<IImportSession> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    if (session.status !== 'preview') {
      throw new ValidationError('Duplicate strategy can only be changed in preview state.');
    }

    const { strategy } = setDuplicateStrategySchema.parse(rawBody);
    await importRowRepository.setDuplicateActionForSession(id, strategy);

    const updated = await importSessionRepository.updateStatus(id, ctx.schoolId, 'preview', {
      duplicateStrategy: strategy,
    });
    return updated!;
  },

  // ── AI-assisted mapping ────────────────────────────────────────────────────

  /**
   * Suggests mappings for every uploaded column not already resolved by the
   * heuristic mapper. Read-only — never writes the mapping itself; the user
   * reviews/edits the suggestions on the mapping screen, then saves via the
   * normal updateMapping endpoint. Only ever called from an explicit
   * "AI Auto Map" click, never automatically.
   */
  async suggestAIMapping(id: string, ctx: AuthContext): Promise<ColumnMappingSuggestion[]> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    if (session.status !== 'preview') {
      throw new ValidationError('AI mapping is only available in preview state.');
    }

    const sampleRows = await importRowRepository.findAllBySession(id);
    if (sampleRows.length === 0) throw new ValidationError('This session has no rows to map from.');

    const allHeaders = Object.keys(sampleRows[0].rawData ?? {});
    const unmappedHeaders = allHeaders.filter((h) => !(h in session.mapping));
    if (unmappedHeaders.length === 0) return [];

    const parsedSample = sampleRows.slice(0, 3).map((r) => ({ rowNumber: r.rowNumber, data: r.rawData }));

    const suggestions = await buildAIColumnMapping(session.importType, unmappedHeaders, parsedSample, ctx.schoolId);

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'import.ai_mapping_requested',
      resource: 'import_sessions',
      resourceId: id,
      details: { importType: session.importType, unmappedCount: unmappedHeaders.length },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return suggestions;
  },

  // ── Named mapping templates ────────────────────────────────────────────────

  async saveMappingTemplate(sessionId: string, rawBody: unknown, ctx: AuthContext) {
    const session = await importSessionRepository.findById(sessionId, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');

    const { name } = saveMappingTemplateSchema.parse(rawBody);
    return importMappingTemplateRepository.saveNamedTemplate(
      ctx.schoolId, session.importType, name, session.mapping, ctx.displayName,
    );
  },

  async listMappingTemplates(rawQuery: unknown, ctx: AuthContext) {
    const { importType } = listMappingTemplatesSchema.parse(rawQuery);
    return importMappingTemplateRepository.listNamedTemplates(ctx.schoolId, importType);
  },

  async deleteMappingTemplate(templateId: string, ctx: AuthContext): Promise<void> {
    const deleted = await importMappingTemplateRepository.deleteNamedTemplate(templateId, ctx.schoolId);
    if (!deleted) throw new NotFoundError('Mapping template');
  },

  // ── Confirm → trigger background processing ────────────────────────────────

  async confirm(id: string, ctx: AuthContext): Promise<IImportSession> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');

    if (session.status !== 'preview') {
      throw new ValidationError(`Cannot confirm a session with status '${session.status}'. Session must be in preview state.`);
    }
    if (session.validRows + session.warningRows === 0) {
      throw new ValidationError('No valid rows to import. Fix errors and re-upload.');
    }

    // The accountant has now seen (and implicitly approved, by confirming) the
    // "new classes detected" banner shown during preview — create/update the
    // Classes & Sections catalog to match before the student rows land.
    if (session.detectedNewClasses?.length) {
      const byClass = new Map<string, Set<string>>();
      for (const d of session.detectedNewClasses) {
        const sections = byClass.get(d.class) ?? new Set<string>();
        sections.add(d.section);
        byClass.set(d.class, sections);
      }
      const existingClasses = await schoolClassRepository.findAll(ctx.schoolId);
      for (const [className, sections] of byClass) {
        let cls = existingClasses.find((c) => c.name.toLowerCase() === className.toLowerCase());
        if (!cls) {
          cls = await schoolClassRepository.create(ctx.schoolId, className, ctx.displayName);
        }
        for (const section of sections) {
          await schoolClassRepository.addSection(String(cls._id), ctx.schoolId, section, ctx.displayName);
        }
      }
    }

    const updated = await importSessionRepository.updateStatus(id, ctx.schoolId, 'processing', {
      startedAt: new Date(),
    });

    await importSessionRepository.pushTimelineEvent(id, ctx.schoolId, {
      event: 'confirmed',
      at: new Date(),
    });

    // The user has now committed to this mapping — remember it for this exact
    // header shape so the next matching upload from this school skips straight
    // to preview instead of re-guessing.
    if (session.headerSignature) {
      await importMappingTemplateRepository.rememberMapping(
        ctx.schoolId, session.importType, session.headerSignature, session.mapping, ctx.displayName,
      );
    }

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'import.confirmed',
      resource: 'import_sessions',
      resourceId: id,
      details: { importType: session.importType, validRows: session.validRows },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    // Fire-and-forget background processing
    setImmediate(() => {
      runImport(session, ctx).catch((err) =>
        logger.error('runImport unhandled error', { sessionId: id, error: String(err) })
      );
    });

    return updated!;
  },

  // ── Cancel ─────────────────────────────────────────────────────────────────

  async cancel(id: string, ctx: AuthContext): Promise<IImportSession> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');

    const cancellable: IImportSession['status'][] = ['uploading', 'parsing', 'validating', 'preview'];
    if (!cancellable.includes(session.status)) {
      throw new ValidationError(`Cannot cancel a session with status '${session.status}'.`);
    }

    const updated = await importSessionRepository.updateStatus(id, ctx.schoolId, 'cancelled');

    await importSessionRepository.pushTimelineEvent(id, ctx.schoolId, {
      event: 'cancelled',
      at: new Date(),
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'import.cancelled',
      resource: 'import_sessions',
      resourceId: id,
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return updated!;
  },

  // ── Rollback ───────────────────────────────────────────────────────────────

  async rollback(id: string, ctx: AuthContext): Promise<IImportSession> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');

    if (session.status !== 'completed') {
      throw new ValidationError(`Only completed imports can be rolled back. Current status: '${session.status}'.`);
    }
    if (session.importedIds.length === 0) {
      throw new ValidationError('No records to roll back.');
    }

    // Update status immediately so UI reflects rollback in progress
    const updated = await importSessionRepository.updateStatus(id, ctx.schoolId, 'processing');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'import.rolled_back',
      resource: 'import_sessions',
      resourceId: id,
      details: { importType: session.importType, count: session.importedIds.length },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    // Fire-and-forget rollback
    setImmediate(() => {
      rollbackImport(session, ctx).catch((err) =>
        logger.error('rollbackImport unhandled error', { sessionId: id, error: String(err) })
      );
    });

    return updated!;
  },

  // ── Queries ────────────────────────────────────────────────────────────────

  async list(rawQuery: unknown, ctx: AuthContext) {
    const opts = listSessionsSchema.parse(rawQuery);
    return importSessionRepository.findAll(ctx.schoolId, opts);
  },

  async getById(id: string, ctx: AuthContext): Promise<IImportSession> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    return session;
  },

  async getRows(id: string, rawQuery: unknown, ctx: AuthContext) {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    const opts = listRowsSchema.parse(rawQuery);
    return importRowRepository.findBySession(id, opts);
  },

  /**
   * Inline preview editing — the user fixes a failed/warned row's field
   * values directly (e.g. types in a missing Class) instead of re-editing
   * the source file and re-uploading. Re-runs the same validator (and
   * duplicate check) a fresh upload would, then updates the session's
   * aggregate counts so the preview totals stay accurate.
   */
  async updateRow(id: string, rowNumber: number, rawBody: unknown, ctx: AuthContext) {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    if (session.status !== 'preview') {
      throw new ValidationError('Rows can only be edited in preview state.');
    }

    const row = await importRowRepository.findByRowNumber(id, rowNumber);
    if (!row) throw new NotFoundError('Row');

    const { mappedData: edits } = updateRowSchema.parse(rawBody);
    const merged: Record<string, unknown> = { ...row.mappedData, ...edits };

    const validator = getValidator(session.importType);
    const result = validator.validate(merged);
    const persistedData = result.status === 'error' ? merged : result.cleanData;

    let duplicateOf: string | undefined;
    const processor = getProcessor(session.importType);
    if (result.status !== 'error' && processor.findDuplicate) {
      duplicateOf = await processor.findDuplicate(persistedData, ctx.schoolId);
    }

    await importRowRepository.replaceRow(id, rowNumber, {
      mappedData: persistedData,
      status: result.status as 'valid' | 'warning' | 'error',
      errors: result.errors,
      warnings: result.warnings,
      duplicateOf,
    });

    // Recompute session-wide totals from every row's current status.
    const [counts, duplicateRows] = await Promise.all([
      importRowRepository.countByStatus(id),
      importRowRepository.countDuplicates(id),
    ]);
    const validRows = counts['valid'] ?? 0;
    const warningRows = counts['warning'] ?? 0;
    const failedRows = counts['error'] ?? 0;

    const updatedSession = await importSessionRepository.updateStatus(id, ctx.schoolId, 'preview', {
      validRows, warningRows, failedRows, duplicateRows,
    });

    return { session: updatedSession!, row: await importRowRepository.findByRowNumber(id, rowNumber) };
  },

  /**
   * Manually append a row that wasn't in the uploaded file — e.g. a student
   * missed in the export. Starts out validated against whatever fields were
   * given (typically empty, so it lands as 'error' until filled in via the
   * normal inline-edit flow, same as any other row).
   */
  async addRow(id: string, rawBody: unknown, ctx: AuthContext) {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    if (session.status !== 'preview') {
      throw new ValidationError('Rows can only be added in preview state.');
    }

    const { mappedData } = addRowSchema.parse(rawBody);
    const rowNumber = (await importRowRepository.maxRowNumber(id)) + 1;

    const validator = getValidator(session.importType);
    const result = validator.validate(mappedData);
    const persistedData = result.status === 'error' ? mappedData : result.cleanData;

    let duplicateOf: string | undefined;
    const processor = getProcessor(session.importType);
    if (result.status !== 'error' && processor.findDuplicate) {
      duplicateOf = await processor.findDuplicate(persistedData, ctx.schoolId);
    }

    const row = await importRowRepository.insertRow({
      sessionId: id,
      schoolId: ctx.schoolId,
      rowNumber,
      rawData: mappedData,
      mappedData: persistedData,
      status: result.status as 'valid' | 'warning' | 'error',
      errors: result.errors,
      warnings: result.warnings,
    });
    if (duplicateOf) await importRowRepository.replaceRow(id, rowNumber, { ...row, duplicateOf });

    const updatedSession = await this.recomputeSessionCounts(id, ctx.schoolId, { totalRowsDelta: 1 });
    return { session: updatedSession, row };
  },

  /** Removes a manually-unwanted row from the preview (e.g. a stray blank line
   *  the header-detection didn't filter) — never touches already-imported records. */
  async deleteRow(id: string, rowNumber: number, ctx: AuthContext) {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');
    if (session.status !== 'preview') {
      throw new ValidationError('Rows can only be deleted in preview state.');
    }

    const deleted = await importRowRepository.deleteRow(id, rowNumber);
    if (!deleted) throw new NotFoundError('Row');

    return this.recomputeSessionCounts(id, ctx.schoolId, { totalRowsDelta: -1 });
  },

  /** Recomputes every row-status aggregate from the current rows and writes it
   *  back to the session — shared by add/delete so the live summary counts
   *  (and totalRows, which those two actions actually change) never drift. */
  async recomputeSessionCounts(id: string, schoolId: string, opts: { totalRowsDelta?: number } = {}): Promise<IImportSession> {
    const session = await importSessionRepository.findById(id, schoolId);
    if (!session) throw new NotFoundError('Import session');

    const [counts, duplicateRows] = await Promise.all([
      importRowRepository.countByStatus(id),
      importRowRepository.countDuplicates(id),
    ]);

    const updated = await importSessionRepository.updateStatus(id, schoolId, 'preview', {
      validRows: counts['valid'] ?? 0,
      warningRows: counts['warning'] ?? 0,
      failedRows: counts['error'] ?? 0,
      duplicateRows,
      totalRows: session.totalRows + (opts.totalRowsDelta ?? 0),
    });
    return updated!;
  },

  // ── Error report ───────────────────────────────────────────────────────────

  /** CSV of every failed row — original values plus which field(s) failed and why —
   *  so a school can fix a source file offline instead of re-reading errors on screen. */
  async exportErrors(id: string, ctx: AuthContext): Promise<{ filename: string; csv: string }> {
    const session = await importSessionRepository.findById(id, ctx.schoolId);
    if (!session) throw new NotFoundError('Import session');

    const errorRows = await importRowRepository.findAllBySession(id, 'error');
    if (errorRows.length === 0) throw new ValidationError('This session has no failed rows to export.');

    const sourceColumns = Array.from(
      new Set(errorRows.flatMap((r) => Object.keys(r.rawData ?? {})))
    );

    const header = ['Row #', ...sourceColumns, 'Errors'];
    const lines = [header.map(csvCell).join(',')];

    for (const row of errorRows) {
      const errorText = (row.errors ?? []).map((e) => `${e.field}: ${e.message}`).join(' | ');
      const cells = [
        String(row.rowNumber),
        ...sourceColumns.map((col) => String(row.rawData?.[col] ?? '')),
        errorText,
      ];
      lines.push(cells.map(csvCell).join(','));
    }

    return {
      filename: `${session.importType}-import-errors-${id}.csv`,
      csv: lines.join('\r\n'),
    };
  },

  // ── Templates ──────────────────────────────────────────────────────────────

  listTemplates() {
    return listTemplates();
  },

  generateTemplate(importType: ImportType) {
    return generateTemplateBuffer(importType);
  },
};
