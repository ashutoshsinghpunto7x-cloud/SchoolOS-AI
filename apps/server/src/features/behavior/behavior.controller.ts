import { Request, Response, NextFunction } from 'express';
import { behaviorService } from './behavior.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const behaviorController = {
  // ── Options ─────────────────────────────────────────────────────────────

  /** GET /behavior/options — school-wide + (for a teacher) their own custom options */
  async listOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const options = await behaviorService.listOptions(ctx);
      sendSuccess(res, options);
    } catch (err) { next(err); }
  },

  /** POST /behavior/options — admin/principal create school-wide; teacher creates their own */
  async createOption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const option = await behaviorService.createOption(req.body, ctx);
      sendCreated(res, option, 'Behaviour option created');
    } catch (err) { next(err); }
  },

  /** PATCH /behavior/options/:id — edit/deactivate */
  async updateOption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const option = await behaviorService.updateOption(req.params.id, req.body, ctx);
      sendSuccess(res, option, 'Behaviour option updated');
    } catch (err) { next(err); }
  },

  // ── Window ──────────────────────────────────────────────────────────────

  /** GET /behavior/window — is behaviour marking open right now, and when */
  async getWindowStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const status = await behaviorService.getWindowStatus(ctx);
      sendSuccess(res, status);
    } catch (err) { next(err); }
  },

  // ── Records ─────────────────────────────────────────────────────────────

  /** POST /behavior — mark single */
  async markSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const record = await behaviorService.markSingle(req.body, ctx);
      sendCreated(res, record, 'Behaviour recorded');
    } catch (err) { next(err); }
  },

  /** POST /behavior/bulk — bulk submit for a class */
  async bulkMark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const records = await behaviorService.bulkMark(req.body, ctx);
      sendCreated(res, records, `${records.length} behaviour records saved`);
    } catch (err) { next(err); }
  },

  /** GET /behavior/class/:class/:section — all records for a class on a date */
  async getClassRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const records = await behaviorService.getClassRecords(req.params.class, req.params.section, req.query, ctx);
      sendSuccess(res, records);
    } catch (err) { next(err); }
  },

  /** GET /behavior/student/:studentId — paginated history */
  async getStudentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await behaviorService.getStudentHistory(req.params.studentId, req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** DELETE /behavior/:id */
  async deleteRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await behaviorService.deleteRecord(req.params.id, ctx);
      sendSuccess(res, null, 'Behaviour record deleted');
    } catch (err) { next(err); }
  },
};
