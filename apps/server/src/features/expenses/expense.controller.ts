import { Request, Response, NextFunction } from 'express';
import { expenseService } from './expense.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const expenseController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await expenseService.createExpenseRecord(req.body, ctx);
      sendCreated(res, record, 'Expense recorded');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await expenseService.listExpenseRecords(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
      const dateTo   = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
      const summary  = await expenseService.getSummary(ctx, dateFrom, dateTo);
      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await expenseService.getExpenseRecord(req.params.id, ctx);
      sendSuccess(res, record);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await expenseService.updateExpenseRecord(req.params.id, req.body, ctx);
      sendSuccess(res, record, 'Expense updated');
    } catch (err) { next(err); }
  },

  async deleteExpenseRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await expenseService.deleteExpenseRecord(req.params.id, ctx);
      sendSuccess(res, null, 'Expense deleted');
    } catch (err) { next(err); }
  },
};
