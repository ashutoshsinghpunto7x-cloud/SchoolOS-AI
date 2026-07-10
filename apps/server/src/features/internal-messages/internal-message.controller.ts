import { Request, Response, NextFunction } from 'express';
import { internalMessageService } from './internal-message.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const internalMessageController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const data = await internalMessageService.listForUser(ctx.userId, ctx.schoolId, { page, limit });
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async pendingAcknowledgment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await internalMessageService.listPendingAcknowledgment(ctx.userId, ctx.schoolId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await internalMessageService.markRead(ctx.userId, req.params.id);
      sendSuccess(res, null, 'Marked as read');
    } catch (err) {
      next(err);
    }
  },

  async acknowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await internalMessageService.acknowledge(ctx.userId, req.params.id, ctx);
      sendSuccess(res, null, 'Acknowledged');
    } catch (err) {
      next(err);
    }
  },

  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await internalMessageService.send(req.body, ctx);
      sendCreated(res, result, 'Message sent');
    } catch (err) {
      next(err);
    }
  },

  async listSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const data = await internalMessageService.listSent(ctx.userId, ctx.schoolId, { page, limit });
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await internalMessageService.listTemplates(ctx.schoolId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await internalMessageService.createTemplate(req.body, ctx);
      sendCreated(res, data, 'Template saved');
    } catch (err) {
      next(err);
    }
  },

  async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await internalMessageService.deleteTemplate(req.params.id, ctx);
      sendSuccess(res, null, 'Template deleted');
    } catch (err) {
      next(err);
    }
  },

  async staffDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await internalMessageService.staffDirectory(ctx.schoolId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },
};
