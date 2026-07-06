import { Request, Response, NextFunction } from 'express';
import { classTeacherService } from './class-teacher.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const classTeacherController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await classTeacherService.listClassSections(ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await classTeacherService.upsertClassTeacher(req.body, ctx);
      sendSuccess(res, result, 'Class teacher assigned');
    } catch (err) { next(err); }
  },
};
