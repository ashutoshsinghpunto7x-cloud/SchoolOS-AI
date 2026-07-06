import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const data = await notificationService.listForUser(ctx.userId, ctx.schoolId, { page, limit });
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await notificationService.markRead(ctx.userId, req.params.id);
      sendSuccess(res, null, 'Marked as read');
    } catch (err) {
      next(err);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await notificationService.markAllRead(ctx.userId, ctx.schoolId);
      sendSuccess(res, null, 'All marked as read');
    } catch (err) {
      next(err);
    }
  },

  async broadcastToTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await notificationService.broadcastToTeachers(req.body, ctx);
      sendSuccess(res, result, 'Message sent');
    } catch (err) {
      next(err);
    }
  },
};
