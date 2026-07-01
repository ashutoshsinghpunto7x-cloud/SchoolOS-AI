import { Request, Response, NextFunction } from 'express';
import { teacherWorkspaceService } from './teacher-workspace.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const teacherWorkspaceController = {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await teacherWorkspaceService.getMe(ctx);
      sendSuccess(res, data, 'Workspace loaded');
    } catch (err) {
      next(err);
    }
  },

  async upsertTimetableEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const tt  = await teacherWorkspaceService.upsertOwnTimetableEntry(req.body, ctx);
      sendSuccess(res, tt, 'Period saved');
    } catch (err) {
      next(err);
    }
  },

  async removeTimetableEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const tt  = await teacherWorkspaceService.removeOwnTimetableEntry(req.body, ctx);
      sendSuccess(res, tt, 'Period removed');
    } catch (err) {
      next(err);
    }
  },
};
