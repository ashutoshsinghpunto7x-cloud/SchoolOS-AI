import { Request, Response, NextFunction } from 'express';
import { WorkflowId } from '@schoolos/types';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { workflowService } from './workflow.service';

export const workflowController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await workflowService.listAll(ctx);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await workflowService.getOne(req.params.workflowId as WorkflowId, ctx);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await workflowService.updateConfig(req.params.workflowId as WorkflowId, req.body, ctx);
      sendSuccess(res, data, 'Workflow config updated');
    } catch (err) {
      next(err);
    }
  },

  async trigger(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await workflowService.trigger(req.body, ctx);
      sendCreated(res, data, 'Workflow triggered');
    } catch (err) {
      next(err);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await workflowService.getStats(req.params.workflowId as WorkflowId, ctx);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await workflowService.getDashboardMetrics(ctx);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },
};
