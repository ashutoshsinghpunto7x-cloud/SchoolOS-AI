import { Request, Response, NextFunction } from 'express';
import { visitorService } from './visitor.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const visitorController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const visitor = await visitorService.createVisitor(req.body, ctx);
      sendCreated(res, visitor, 'Visitor checked in');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await visitorService.listVisitors(req.query, ctx);
      sendPaginated(res, result.visitors, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const visitor = await visitorService.getVisitor(req.params.id, ctx);
      sendSuccess(res, visitor);
    } catch (err) { next(err); }
  },

  async checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const visitor = await visitorService.checkOutVisitor(req.params.id, req.body, ctx);
      sendSuccess(res, visitor, 'Visitor checked out');
    } catch (err) { next(err); }
  },

  async deleteVisitor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await visitorService.deleteVisitor(req.params.id, ctx);
      sendSuccess(res, null, 'Visitor record deleted');
    } catch (err) { next(err); }
  },
};
