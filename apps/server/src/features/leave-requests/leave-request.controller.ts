import { Request, Response, NextFunction } from 'express';
import { leaveRequestService } from './leave-request.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const leaveRequestController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await leaveRequestService.create(req.body, ctx);
      sendCreated(res, request, 'Leave request sent for approval');
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const requests = await leaveRequestService.listMine(ctx);
      sendSuccess(res, requests);
    } catch (err) {
      next(err);
    }
  },

  async listPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const requests = await leaveRequestService.listPending(ctx);
      sendSuccess(res, requests);
    } catch (err) {
      next(err);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await leaveRequestService.approve(req.params.id, ctx);
      sendSuccess(res, request, 'Leave request approved');
    } catch (err) {
      next(err);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await leaveRequestService.reject(req.params.id, req.body, ctx);
      sendSuccess(res, request, 'Leave request rejected');
    } catch (err) {
      next(err);
    }
  },
};
