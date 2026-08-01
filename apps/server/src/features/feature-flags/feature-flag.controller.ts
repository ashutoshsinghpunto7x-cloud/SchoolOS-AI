import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from './feature-flag.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const featureFlagController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await featureFlagService.listAll();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const feature = await featureFlagService.create(req.body, ctx);
      sendCreated(res, feature, 'Feature created');
    } catch (err) { next(err); }
  },

  async getByKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feature = await featureFlagService.getByKey(req.params.key);
      sendSuccess(res, feature);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const feature = await featureFlagService.update(req.params.key, req.body, ctx);
      sendSuccess(res, feature, 'Feature updated');
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      await featureFlagService.delete(req.params.key, ctx);
      sendSuccess(res, null, 'Feature deleted');
    } catch (err) { next(err); }
  },

  async rollback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const feature = await featureFlagService.rollback(req.params.key, ctx);
      sendSuccess(res, feature, 'Feature rolled back — disabled for everyone');
    } catch (err) { next(err); }
  },

  async listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await featureFlagService.listAssignments(req.params.key);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const assignment = await featureFlagService.createAssignment(req.params.key, req.body, ctx);
      sendCreated(res, assignment, 'Assignment created');
    } catch (err) { next(err); }
  },

  async deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      await featureFlagService.deleteAssignment(req.params.key, req.params.assignmentId, ctx);
      sendSuccess(res, null, 'Assignment removed');
    } catch (err) { next(err); }
  },

  async getFeaturesForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await featureFlagService.getFeaturesForUser(req.params.userId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async setTesterFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      await featureFlagService.setTesterFlags(req.params.userId, req.body, ctx);
      sendSuccess(res, null, 'Tester flags updated');
    } catch (err) { next(err); }
  },

  /** GET /api/feature-flags/evaluate — every authenticated app user (not Ops-gated). */
  async evaluate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const data = await featureFlagService.evaluateAllForUser(ctx);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },
};
