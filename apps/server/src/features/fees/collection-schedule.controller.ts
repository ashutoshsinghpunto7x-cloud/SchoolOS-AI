import { Request, Response, NextFunction } from 'express';
import { collectionScheduleService } from './collection-schedule.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const collectionScheduleController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '';
      const list = await collectionScheduleService.list(ctx.schoolId, academicYear);
      sendSuccess(res, list);
    } catch (err) { next(err); }
  },

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const entry = await collectionScheduleService.upsert(req.body, ctx);
      sendCreated(res, entry, 'Collection schedule updated');
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '';
      await collectionScheduleService.remove(ctx.schoolId, academicYear, req.params.depositMonth);
      sendSuccess(res, null, 'Collection schedule entry removed');
    } catch (err) { next(err); }
  },

  async useDefaultSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const list = await collectionScheduleService.useDefaultSchedule(req.body, ctx);
      sendCreated(res, list, 'Default schedule applied');
    } catch (err) { next(err); }
  },
};
