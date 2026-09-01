import { Request, Response, NextFunction } from 'express';
import { followUpService } from './follow-up.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const followUpController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const followUp = await followUpService.createFollowUp(req.body, ctx);
      sendCreated(res, followUp, 'Follow-up scheduled');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await followUpService.listFollowUps(req.query, ctx);
      sendPaginated(res, result.followUps, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const followUp = await followUpService.getFollowUp(req.params.id, ctx);
      sendSuccess(res, followUp);
    } catch (err) { next(err); }
  },

  async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const followUp = await followUpService.completeFollowUp(req.params.id, req.body, ctx);
      sendSuccess(res, followUp, 'Follow-up marked complete');
    } catch (err) { next(err); }
  },

  async reschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const followUp = await followUpService.rescheduleFollowUp(req.params.id, req.body, ctx);
      sendCreated(res, followUp, 'Follow-up rescheduled');
    } catch (err) { next(err); }
  },

  async deleteFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await followUpService.deleteFollowUp(req.params.id, ctx);
      sendSuccess(res, null, 'Follow-up deleted');
    } catch (err) { next(err); }
  },
};
