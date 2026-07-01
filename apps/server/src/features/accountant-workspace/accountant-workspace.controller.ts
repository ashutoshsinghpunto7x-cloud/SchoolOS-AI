import { Request, Response, NextFunction } from 'express';
import { accountantWorkspaceService } from './accountant-workspace.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const accountantWorkspaceController = {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await accountantWorkspaceService.getDashboard(ctx);
      sendSuccess(res, data, 'Dashboard loaded');
    } catch (err) {
      next(err);
    }
  },

  async getGroupedDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await accountantWorkspaceService.getGroupedDefaulters(ctx);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async sendDefaultersToTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await accountantWorkspaceService.sendDefaultersToTeacher(req.body, ctx);
      sendSuccess(res, null, 'Defaulters list emailed to teacher');
    } catch (err) {
      next(err);
    }
  },

  async sendReceiptEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await accountantWorkspaceService.sendReceiptEmail(req.body, ctx);
      sendSuccess(res, null, 'Receipt emailed');
    } catch (err) {
      next(err);
    }
  },
};
