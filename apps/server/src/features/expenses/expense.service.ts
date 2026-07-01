import { expenseRepository, PaginatedExpenses, ExpenseSummary, CreateExpenseData } from './expense.repository';
import { IExpenseRecord } from './expense.model';
import {
  createExpenseRecordSchema,
  updateExpenseRecordSchema,
  listExpensesSchema,
} from './expense.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export const expenseService = {
  async createExpenseRecord(rawInput: unknown, ctx: AuthContext): Promise<IExpenseRecord> {
    const data = createExpenseRecordSchema.parse(rawInput);

    const createData: CreateExpenseData = {
      schoolId: ctx.schoolId,
      title:    data.title,
      category: data.category,
      amount:   data.amount,
      date:     new Date(data.date),
      notes:    data.notes,
      createdBy: ctx.displayName,
    };
    const record = await expenseRepository.create(createData);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'expense.created', resource: 'expenses', resourceId: record._id.toString(),
      details: { title: data.title, category: data.category, amount: data.amount },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async listExpenseRecords(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedExpenses> {
    const opts = listExpensesSchema.parse(rawQuery);
    return expenseRepository.findAll(ctx.schoolId, opts);
  },

  async getExpenseRecord(id: string, ctx: AuthContext): Promise<IExpenseRecord> {
    const record = await expenseRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Expense record');
    return record;
  },

  async updateExpenseRecord(id: string, rawInput: unknown, ctx: AuthContext): Promise<IExpenseRecord> {
    const data = updateExpenseRecordSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const existing = await expenseRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Expense record');

    const update = { ...data, date: data.date ? new Date(data.date) : undefined, updatedBy: ctx.displayName };
    const record = await expenseRepository.update(id, ctx.schoolId, update);
    if (!record) throw new NotFoundError('Expense record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: data.status === 'approved' ? 'expense.approved' : 'expense.updated',
      resource: 'expenses', resourceId: id,
      details: { fields: Object.keys(data) }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async deleteExpenseRecord(id: string, ctx: AuthContext): Promise<void> {
    const existing = await expenseRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Expense record');

    const deleted = await expenseRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Expense record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'expense.deleted', resource: 'expenses', resourceId: id,
      details: { title: existing.title }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async getSummary(ctx: AuthContext, dateFrom?: string, dateTo?: string): Promise<ExpenseSummary> {
    return expenseRepository.getSummary(ctx.schoolId, { dateFrom, dateTo });
  },
};
