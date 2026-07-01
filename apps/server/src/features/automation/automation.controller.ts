import { Request, Response, NextFunction } from 'express';
import { automationService } from './automation.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const automationController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await automationService.list(req.query, ctx);
      sendPaginated(res, result.data, result.meta);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const job = await automationService.getById(req.params.id, ctx);
      sendSuccess(res, job, 'Automation job fetched');
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const job = await automationService.cancel(req.params.id, ctx);
      sendSuccess(res, job, 'Job cancelled');
    } catch (err) {
      next(err);
    }
  },

  async retry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const job = await automationService.retry(req.params.id, ctx);
      sendCreated(res, job, 'Job retry dispatched');
    } catch (err) {
      next(err);
    }
  },

  async webhookCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const secret = req.headers['x-automation-secret'] as string | undefined;
      const job = await automationService.handleWebhook(req.body, secret);
      sendSuccess(res, job, 'Webhook processed');
    } catch (err) {
      next(err);
    }
  },
};
