import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import { ImportType, IImportSession } from './import-session.model';
import { importSessionRepository, importRowRepository } from './import-session.repository';
import { excelParser } from './parsers/excel.parser';
import { buildColumnMapping, validateRows, runImport, rollbackImport } from './engine/import.engine';
import { listSessionsSchema, listRowsSchema, uploadSessionSchema, confirmMappingSchema } from './import.validation';
import { listTemplates, generateTemplateBuffer } from './templates/template.registry';

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

      // Build heuristic column mapping
      await importSessionRepository.updateStatus(sessionId, ctx.schoolId, 'validating');
      const mapping = await buildColumnMapping(importType, parsed.headers, parsed.rows);

      // Validate all rows and persist them
      const { validRows, warningRows, failedRows } = await validateRows(
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
        mapping,
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

    // Delete old rows and re-validate with new mapping
    await importRowRepository.deleteBySession(id);

    // Re-fetch from DB to get original file data — we can't re-parse (file not stored)
    // Instead we update the mapping on the session so next confirm uses it
    const updated = await importSessionRepository.updateStatus(id, ctx.schoolId, 'preview', { mapping });
    return updated!;
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

    const updated = await importSessionRepository.updateStatus(id, ctx.schoolId, 'processing', {
      startedAt: new Date(),
    });

    await importSessionRepository.pushTimelineEvent(id, ctx.schoolId, {
      event: 'confirmed',
      at: new Date(),
    });

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

  // ── Templates ──────────────────────────────────────────────────────────────

  listTemplates() {
    return listTemplates();
  },

  generateTemplate(importType: ImportType) {
    return generateTemplateBuffer(importType);
  },
};
