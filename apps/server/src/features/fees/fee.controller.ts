import { Request, Response, NextFunction } from 'express';
import { feeService } from './fee.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const feeController = {
  /** POST /fees — create a fee record for a student */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await feeService.createFeeRecord(req.body, ctx);
      sendCreated(res, record, 'Fee record created');
    } catch (err) { next(err); }
  },

  /** GET /fees — list with filters */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await feeService.listFeeRecords(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** POST /fees/payment — record a payment */
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await feeService.recordPayment(req.body, ctx);
      sendCreated(res, result, 'Payment recorded successfully');
    } catch (err) { next(err); }
  },

  /** GET /fees/outstanding — pending/overdue records */
  async getOutstanding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await feeService.getOutstanding(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** GET /fees/summary — aggregate dashboard stats */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx          = buildAuthContext(req.user!);
      const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const summary      = await feeService.getSummary(ctx, academicYear);
      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },

  /** GET /fees/student/:studentId — all fees for a student */
  async getStudentFees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const records = await feeService.getStudentFees(req.params.studentId, req.query, ctx);
      sendSuccess(res, records);
    } catch (err) { next(err); }
  },

  /** GET /fees/:id — fee record with payments */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await feeService.getFeeRecord(req.params.id, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  /** PATCH /fees/:id — update fee record */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await feeService.updateFeeRecord(req.params.id, req.body, ctx);
      sendSuccess(res, record, 'Fee record updated');
    } catch (err) { next(err); }
  },

  /** DELETE /fees/:id — soft delete (admin only) */
  async deleteFeeRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await feeService.deleteFeeRecord(req.params.id, ctx);
      sendSuccess(res, null, 'Fee record deleted');
    } catch (err) { next(err); }
  },
};
