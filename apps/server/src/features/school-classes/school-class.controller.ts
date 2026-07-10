import { Request, Response, NextFunction } from 'express';
import { schoolClassService } from './school-class.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const schoolClassController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const classes = await schoolClassService.list(ctx.schoolId);
      sendSuccess(res, classes);
    } catch (err) { next(err); }
  },

  async getFeeOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const rows = await schoolClassService.getFeeOverview(ctx.schoolId);
      sendSuccess(res, rows);
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const cls = await schoolClassService.create(req.body, ctx);
      sendCreated(res, cls, 'Class added');
    } catch (err) { next(err); }
  },

  async rename(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const cls = await schoolClassService.rename(req.params.id, req.body, ctx);
      sendSuccess(res, cls, 'Class renamed');
    } catch (err) { next(err); }
  },

  async addSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const cls = await schoolClassService.addSection(req.params.id, req.body, ctx);
      sendSuccess(res, cls, 'Section added');
    } catch (err) { next(err); }
  },

  async removeSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const cls = await schoolClassService.removeSection(req.params.id, req.body, ctx);
      sendSuccess(res, cls, 'Section removed');
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await schoolClassService.remove(req.params.id, ctx);
      sendSuccess(res, null, 'Class removed');
    } catch (err) { next(err); }
  },
};
