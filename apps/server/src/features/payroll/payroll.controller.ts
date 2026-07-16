import { Request, Response, NextFunction } from 'express';
import { payrollService } from './payroll.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const payrollController = {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await payrollService.generateForEmployee(req.body, ctx);
      sendCreated(res, record, 'Payroll generated');
    } catch (err) { next(err); }
  },

  async generateAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await payrollService.generateForAllEmployees(req.body, ctx);
      sendSuccess(res, result, `Payroll generated for ${result.succeeded.length} employee(s)`);
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await payrollService.listPayroll(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const summary = await payrollService.getSummary(req.query, ctx);
      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const records = await payrollService.listForMe(ctx);
      sendSuccess(res, records);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await payrollService.getPayrollRecord(req.params.id, ctx);
      sendSuccess(res, record);
    } catch (err) { next(err); }
  },

  async markPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await payrollService.markPaid(req.params.id, req.body, ctx);
      sendSuccess(res, record, 'Payroll marked as paid');
    } catch (err) { next(err); }
  },
};
