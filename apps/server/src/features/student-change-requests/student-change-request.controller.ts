import { Request, Response, NextFunction } from 'express';
import { studentChangeRequestService } from './student-change-request.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const studentChangeRequestController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await studentChangeRequestService.create(req.body, ctx);
      sendCreated(res, request, 'Change request sent for approval');
    } catch (err) {
      next(err);
    }
  },

  async listPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const requests = await studentChangeRequestService.listPending(ctx);
      sendSuccess(res, requests);
    } catch (err) {
      next(err);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await studentChangeRequestService.approve(req.params.id, ctx);
      sendSuccess(res, request, 'Change approved and applied');
    } catch (err) {
      next(err);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await studentChangeRequestService.reject(req.params.id, req.body, ctx);
      sendSuccess(res, request, 'Change request rejected');
    } catch (err) {
      next(err);
    }
  },
};
