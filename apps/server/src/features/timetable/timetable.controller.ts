import { Request, Response, NextFunction } from 'express';
import { timetableService } from './timetable.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';

export const timetableController = {
  // ── Period Slots ────────────────────────────────────────────────────────────

  async listPeriodSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const slots = await timetableService.listPeriodSlots(ctx);
      sendSuccess(res, slots);
    } catch (err) { next(err); }
  },

  async createPeriodSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const slot = await timetableService.createPeriodSlot(req.body, ctx);
      sendCreated(res, slot, 'Period slot created');
    } catch (err) { next(err); }
  },

  async updatePeriodSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const slot = await timetableService.updatePeriodSlot(req.params.slotId, req.body, ctx);
      sendSuccess(res, slot, 'Period slot updated');
    } catch (err) { next(err); }
  },

  async deletePeriodSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await timetableService.deletePeriodSlot(req.params.slotId, ctx);
      sendSuccess(res, null, 'Period slot deleted');
    } catch (err) { next(err); }
  },

  async reorderPeriodSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const { orderedIds } = req.body as { orderedIds: string[] };
      await timetableService.reorderPeriodSlots(orderedIds, ctx);
      sendSuccess(res, null, 'Period slots reordered');
    } catch (err) { next(err); }
  },

  // ── Timetables ──────────────────────────────────────────────────────────────

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await timetableService.createTimetable(req.body, ctx);
      sendCreated(res, tt, 'Timetable created');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await timetableService.listTimetables(req.query, ctx);
      sendPaginated(res, result.timetables, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await timetableService.getTimetable(req.params.id, ctx);
      sendSuccess(res, tt);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await timetableService.updateTimetable(req.params.id, req.body, ctx);
      sendSuccess(res, tt, 'Timetable updated');
    } catch (err) { next(err); }
  },

  async upsertEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await timetableService.upsertEntry(req.params.id, req.body, ctx);
      sendSuccess(res, tt, 'Entry updated');
    } catch (err) { next(err); }
  },

  async removeEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const { dayOfWeek, slotId } = req.body as { dayOfWeek: number; slotId: string };
      const tt  = await timetableService.removeEntry(req.params.id, dayOfWeek, slotId, ctx);
      sendSuccess(res, tt, 'Entry removed');
    } catch (err) { next(err); }
  },

  async bulkUpdateEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await timetableService.bulkUpdateEntries(req.params.id, req.body, ctx);
      sendSuccess(res, tt, 'Entries updated');
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await timetableService.updateStatus(req.params.id, req.body, ctx);
      sendSuccess(res, tt, 'Status updated');
    } catch (err) { next(err); }
  },

  async deleteTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await timetableService.deleteTimetable(req.params.id, ctx);
      sendSuccess(res, null, 'Timetable deleted');
    } catch (err) { next(err); }
  },

  async getTeacherSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const schedule = await timetableService.getTeacherSchedule(req.params.teacherId, ctx);
      sendSuccess(res, schedule);
    } catch (err) { next(err); }
  },

  async detectConflicts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx       = buildAuthContext(req.user!);
      const conflicts = await timetableService.detectConflicts(ctx);
      sendSuccess(res, conflicts);
    } catch (err) { next(err); }
  },

  // ── Substitutes ─────────────────────────────────────────────────────────────

  async createSubstitute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const sub = await timetableService.createSubstitute(req.body, ctx);
      sendCreated(res, sub, 'Substitute assigned');
    } catch (err) { next(err); }
  },

  async listSubstitutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await timetableService.listSubstitutes(req.query, ctx);
      sendPaginated(res, result.substitutes, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async updateSubstitute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const sub = await timetableService.updateSubstitute(req.params.subId, req.body, ctx);
      sendSuccess(res, sub, 'Substitute updated');
    } catch (err) { next(err); }
  },

  async deleteSubstitute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await timetableService.deleteSubstitute(req.params.subId, ctx);
      sendSuccess(res, null, 'Substitute removed');
    } catch (err) { next(err); }
  },

  async getNeedsSubstitute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().split('T')[0];
      const needed = await timetableService.getNeedsSubstitute(ctx.schoolId, date);
      sendSuccess(res, needed);
    } catch (err) { next(err); }
  },

  async suggestSubstituteTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const { class: cls, section, excludeTeacherId } = req.query as Record<string, string | undefined>;
      if (!cls || !section) throw new ValidationError('class and section are required');
      const suggestions = await timetableService.suggestSubstituteTeachers(ctx.schoolId, cls, section, excludeTeacherId);
      sendSuccess(res, suggestions);
    } catch (err) { next(err); }
  },
};
