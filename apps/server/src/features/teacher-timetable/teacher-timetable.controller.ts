import { Request, Response, NextFunction } from 'express';
import { teacherTimetableService } from './teacher-timetable.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const teacherTimetableController = {
  async getOrCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await teacherTimetableService.getOrCreate(req.body, ctx);
      sendCreated(res, tt, 'Teacher timetable ready');
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await teacherTimetableService.getById(req.params.id, ctx);
      sendSuccess(res, tt);
    } catch (err) { next(err); }
  },

  async getForTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await teacherTimetableService.getLatestForTeacher(req.params.teacherId, ctx);
      sendSuccess(res, tt);
    } catch (err) { next(err); }
  },

  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await teacherTimetableService.getMine(ctx);
      sendSuccess(res, tt);
    } catch (err) { next(err); }
  },

  async bulkUpdateEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await teacherTimetableService.bulkUpdateEntries(req.params.id, req.body, ctx);
      sendSuccess(res, result, 'Entries updated');
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tt  = await teacherTimetableService.updateStatus(req.params.id, req.body, ctx);
      sendSuccess(res, tt, 'Status updated');
    } catch (err) { next(err); }
  },

  async deleteTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await teacherTimetableService.delete(req.params.id, ctx);
      sendSuccess(res, null, 'Teacher timetable deleted');
    } catch (err) { next(err); }
  },
};
