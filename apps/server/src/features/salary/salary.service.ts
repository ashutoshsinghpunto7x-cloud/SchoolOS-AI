import { salaryRepository, PaginatedSalary, SalarySummary, CreateSalaryData } from './salary.repository';
import { ISalaryRecord } from './salary.model';
import {
  createSalaryRecordSchema,
  updateSalaryRecordSchema,
  markSalaryPaidSchema,
  listSalarySchema,
} from './salary.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

// The server may run serverless (Vercel), so a persistent cron isn't reliable —
// instead, opportunistically flip 'scheduled' salaries past their due date to
// 'pending' whenever list/summary data is read, throttled to once/hour per
// instance. Mirrors the same pattern used for fee overdue sweeps.
let lastDueSweep = 0;
async function ensureDueMarked(): Promise<void> {
  const now = Date.now();
  if (now - lastDueSweep < 60 * 60 * 1000) return;
  lastDueSweep = now;
  await salaryRepository.markDue(new Date()).catch(() => {});
}

export const salaryService = {
  ensureDueMarked,

  async createSalaryRecord(rawInput: unknown, ctx: AuthContext): Promise<ISalaryRecord> {
    const data = createSalaryRecordSchema.parse(rawInput);
    const dueDate = new Date(data.dueDate);
    const initialStatus: ISalaryRecord['status'] = dueDate.getTime() <= Date.now() ? 'pending' : 'scheduled';

    const createData: CreateSalaryData = {
      schoolId:     ctx.schoolId,
      employeeName: data.employeeName,
      designation:  data.designation,
      teacherId:    data.teacherId,
      month:        data.month,
      year:         data.year,
      amount:       data.amount,
      dueDate,
      status:       initialStatus,
      notes:        data.notes,
      createdBy:    ctx.displayName,
    };
    const record = await salaryRepository.create(createData);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'salary.created', resource: 'salary', resourceId: record._id.toString(),
      details: { employeeName: data.employeeName, month: data.month, year: data.year, amount: data.amount },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async listSalaryRecords(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedSalary> {
    await ensureDueMarked();
    const opts = listSalarySchema.parse(rawQuery);
    return salaryRepository.findAll(ctx.schoolId, opts);
  },

  async getSalaryRecord(id: string, ctx: AuthContext): Promise<ISalaryRecord> {
    const record = await salaryRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Salary record');
    return record;
  },

  async updateSalaryRecord(id: string, rawInput: unknown, ctx: AuthContext): Promise<ISalaryRecord> {
    const data = updateSalaryRecordSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const existing = await salaryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Salary record');
    if (existing.status === 'paid') {
      throw new ValidationError('Cannot edit a salary record that is already paid');
    }

    const record = await salaryRepository.update(id, ctx.schoolId, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      updatedBy: ctx.displayName,
    });
    if (!record) throw new NotFoundError('Salary record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'salary.updated', resource: 'salary', resourceId: id,
      details: { fields: Object.keys(data) }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  /** Accountant override — pull a still-scheduled salary into 'pending' ahead of its due date. */
  async forcePending(id: string, ctx: AuthContext): Promise<ISalaryRecord> {
    const existing = await salaryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Salary record');
    if (existing.status !== 'scheduled') {
      throw new ValidationError(`This salary record is already ${existing.status} — nothing to change.`);
    }

    const record = await salaryRepository.forcePending(id, ctx.schoolId, ctx.displayName);
    if (!record) throw new NotFoundError('Salary record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'salary.forced_pending', resource: 'salary', resourceId: id,
      details: { employeeName: existing.employeeName }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async markPaid(id: string, rawInput: unknown, ctx: AuthContext): Promise<ISalaryRecord> {
    const data = markSalaryPaidSchema.parse(rawInput);

    const existing = await salaryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Salary record');
    if (existing.status === 'paid') {
      throw new ValidationError('This salary record is already marked as paid');
    }

    const record = await salaryRepository.markPaid(
      id, ctx.schoolId, new Date(data.paidDate), data.paymentMode, ctx.displayName, data.notes,
    );
    if (!record) throw new NotFoundError('Salary record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'salary.paid', resource: 'salary', resourceId: id,
      details: { employeeName: existing.employeeName, amount: existing.amount, paymentMode: data.paymentMode },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async deleteSalaryRecord(id: string, ctx: AuthContext): Promise<void> {
    const existing = await salaryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Salary record');

    const deleted = await salaryRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Salary record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'salary.deleted', resource: 'salary', resourceId: id,
      details: { employeeName: existing.employeeName }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async getSummary(ctx: AuthContext, month?: string, year?: number): Promise<SalarySummary> {
    await ensureDueMarked();
    return salaryRepository.getSummary(ctx.schoolId, { month, year });
  },
};
