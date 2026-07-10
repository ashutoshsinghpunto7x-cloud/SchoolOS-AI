import { Request, Response, NextFunction } from 'express';
import { feeStructureService } from './fee-structure.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const feeStructureController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const list = await feeStructureService.list(ctx.schoolId, academicYear);
      sendSuccess(res, list);
    } catch (err) { next(err); }
  },

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const structure = await feeStructureService.upsert(req.body, ctx);
      sendCreated(res, structure, 'Fee structure updated');
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await feeStructureService.remove(req.params.id, ctx);
      sendSuccess(res, null, 'Fee structure entry removed');
    } catch (err) { next(err); }
  },

  async listPendingDiscounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const list = await feeStructureService.listPendingDiscounts(ctx.schoolId);
      sendSuccess(res, list);
    } catch (err) { next(err); }
  },

  async listStudentDiscounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const list = await feeStructureService.listStudentDiscounts(req.params.studentId, ctx);
      sendSuccess(res, list);
    } catch (err) { next(err); }
  },

  async createDiscountRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await feeStructureService.createDiscountRequest(req.body, ctx);
      sendCreated(res, request, 'Discount request sent to principal for approval');
    } catch (err) { next(err); }
  },

  async approveDiscountRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await feeStructureService.approveDiscountRequest(req.params.id, req.body, ctx);
      sendSuccess(res, request, 'Discount approved');
    } catch (err) { next(err); }
  },

  async rejectDiscountRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await feeStructureService.rejectDiscountRequest(req.params.id, req.body, ctx);
      sendSuccess(res, request, 'Discount rejected');
    } catch (err) { next(err); }
  },
};
