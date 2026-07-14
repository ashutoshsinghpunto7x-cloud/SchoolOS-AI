import { Request, Response, NextFunction } from 'express';
import { salaryService } from './salary.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const salaryController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await salaryService.createSalaryRecord(req.body, ctx);
      sendCreated(res, record, 'Salary record created');
    } catch (err) { next(err); }
  },

  async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const records = await salaryService.bulkCreateSalaryRecords(req.body, ctx);
      sendCreated(res, records, `${records.length} salary records created`);
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await salaryService.listSalaryRecords(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const month   = typeof req.query.month === 'string' ? req.query.month : undefined;
      const year    = req.query.year ? Number(req.query.year) : undefined;
      const summary = await salaryService.getSummary(ctx, month, year);
      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await salaryService.getSalaryRecord(req.params.id, ctx);
      sendSuccess(res, record);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await salaryService.updateSalaryRecord(req.params.id, req.body, ctx);
      sendSuccess(res, record, 'Salary record updated');
    } catch (err) { next(err); }
  },

  async markPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await salaryService.markPaid(req.params.id, req.body, ctx);
      sendSuccess(res, record, 'Salary marked as paid');
    } catch (err) { next(err); }
  },

  async forcePending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await salaryService.forcePending(req.params.id, ctx);
      sendSuccess(res, record, 'Salary moved to pending');
    } catch (err) { next(err); }
  },

  async deleteSalaryRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await salaryService.deleteSalaryRecord(req.params.id, ctx);
      sendSuccess(res, null, 'Salary record deleted');
    } catch (err) { next(err); }
  },
};
