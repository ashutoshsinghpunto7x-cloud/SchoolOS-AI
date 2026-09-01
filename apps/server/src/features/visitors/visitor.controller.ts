import { Request, Response, NextFunction } from 'express';
import { visitorService } from './visitor.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';

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

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const history = await visitorService.getVisitorHistory(req.params.id, ctx);
      sendSuccess(res, history);
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const visitor = await visitorService.updateStatus(req.params.id, req.body, ctx);
      sendSuccess(res, visitor, `Visitor marked as ${visitor.status}`);
    } catch (err) { next(err); }
  },

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the photo in a "file" form field.');
      const ctx     = buildAuthContext(req.user!);
      const visitor = await visitorService.uploadPhoto(req.params.id, req.file, ctx);
      sendSuccess(res, visitor, 'Photo saved');
    } catch (err) { next(err); }
  },

  async uploadIdProof(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the ID proof in a "file" form field.');
      const ctx     = buildAuthContext(req.user!);
      const visitor = await visitorService.uploadIdProof(req.params.id, req.body, req.file, ctx);
      sendSuccess(res, visitor, 'ID proof saved');
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

  async arriveFromAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const visitor = await visitorService.arriveFromAppointment(req.params.appointmentId, ctx);
      sendCreated(res, visitor, 'Visitor checked in from appointment');
    } catch (err) { next(err); }
  },
};
