import { Request, Response, NextFunction } from 'express';
import { parentWorkspaceService } from './parent-workspace.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';

export const parentWorkspaceController = {
  async getWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const childId = typeof req.query.childId === 'string' ? req.query.childId : undefined;
      const data = await parentWorkspaceService.getWorkspace(ctx, childId);
      sendSuccess(res, data, 'Parent workspace loaded');
    } catch (err) {
      next(err);
    }
  },

  async askAI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const { childId, question } = req.body as { childId?: string; question?: string };
      if (!childId || !question) throw new ValidationError('childId and question are required');
      const text = await parentWorkspaceService.askAI(ctx, childId, question);
      sendSuccess(res, { text }, 'Answered');
    } catch (err) {
      next(err);
    }
  },
};
