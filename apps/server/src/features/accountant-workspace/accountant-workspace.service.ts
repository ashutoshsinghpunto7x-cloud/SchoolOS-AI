import { feeRepository } from '../fees/fee.repository';
import { feePaymentRepository } from '../fees/fee.payment.repository';
import { salaryRepository } from '../salary/salary.repository';
import { expenseRepository } from '../expenses/expense.repository';
import { teacherRepository } from '../teachers/teacher.repository';
import { automationService } from '../automation/automation.service';
import { auditService } from '../audit/audit.service';
import { AuditLog } from '../audit/audit.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import {
  sendDefaultersToTeacherSchema,
  sendReceiptEmailSchema,
} from './accountant-workspace.validation';
import type {
  AccountantDashboardData,
  RecentFeeCollection,
  FeeDefaulter,
  AccountingActivityEntry,
  ClassDefaulterGroup,
} from '@schoolos/types';
import type { IFeeRecord } from '../fees/fee.model';

const ACCOUNTING_ACTIONS = [
  'fee.payment_recorded', 'fee.created', 'fee.updated',
  'salary.created', 'salary.paid', 'salary.updated',
  'expense.created', 'expense.approved', 'expense.updated',
] as const;

const ACTIVITY_DESCRIPTIONS: Record<string, (details: Record<string, unknown>) => string> = {
  'fee.payment_recorded': (d) => `Collected ₹${d.amount} fee payment`,
  'fee.created':          (d) => `Assigned new fee (₹${d.totalAmount})`,
  'fee.updated':          () => 'Updated a fee record',
  'salary.created':       (d) => `Added salary record for ${d.employeeName}`,
  'salary.paid':          (d) => `Paid salary to ${d.employeeName} (₹${d.amount})`,
  'salary.updated':       () => 'Updated a salary record',
  'expense.created':      (d) => `Recorded expense: ${d.title} (₹${d.amount})`,
  'expense.approved':     () => 'Approved an expense',
  'expense.updated':      () => 'Updated an expense',
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((a.getTime() - b.getTime()) / 86_400_000));
}

function toFeeDefaulter(rec: IFeeRecord, today: Date): FeeDefaulter {
  return {
    feeRecordId: String((rec as unknown as { _id: { toString(): string } })._id),
    studentId:   rec.studentId,
    studentName: rec.studentName,
    class:       rec.class,
    section:     rec.section,
    balance:     rec.balance,
    dueDate:     rec.dueDate.toISOString(),
    daysOverdue: daysBetween(today, startOfDay(rec.dueDate)),
  };
}

export const accountantWorkspaceService = {
  async getDashboard(ctx: AuthContext): Promise<AccountantDashboardData> {
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const [
      feesCollectedToday,
      feeSummary,
      salarySummary,
      expenseSummary,
      recentCollectionsRaw,
      outstanding,
      recentAuditLogs,
    ] = await Promise.all([
      feePaymentRepository.getTotalCollectedBetween(ctx.schoolId, today, tomorrow),
      feeRepository.getSummary(ctx.schoolId),
      salaryRepository.getSummary(ctx.schoolId),
      expenseRepository.getSummary(ctx.schoolId),
      feePaymentRepository.getRecentWithStudent(ctx.schoolId, 8),
      feeRepository.findOutstanding(ctx.schoolId, { page: 1, limit: 8 }),
      AuditLog.find({ schoolId: ctx.schoolId, action: { $in: ACCOUNTING_ACTIONS } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const recentCollections: RecentFeeCollection[] = recentCollectionsRaw.map((r) => ({
      feeRecordId: r.feeRecordId,
      paymentId:   r.paymentId,
      studentName: r.studentName,
      class:       r.class,
      section:     r.section,
      amount:      r.amount,
      paymentMode: r.paymentMode,
      paymentDate: r.paymentDate.toISOString(),
      createdAt:   r.createdAt.toISOString(),
    }));

    const defaulters: FeeDefaulter[] = outstanding.records.map((rec) => toFeeDefaulter(rec, today));

    const recentActivity: AccountingActivityEntry[] = recentAuditLogs.map((log) => {
      const describe = ACTIVITY_DESCRIPTIONS[log.action] ?? (() => log.action);
      return {
        _id:         String((log as unknown as { _id: { toString(): string } })._id),
        action:      log.action,
        description: describe((log.details ?? {}) as Record<string, unknown>),
        amount:      (log.details as Record<string, unknown> | undefined)?.amount as number | undefined,
        performedBy: log.userDisplayName,
        createdAt:   (log.createdAt as Date).toISOString(),
      };
    });

    return {
      feesCollectedToday,
      feeSummary,
      salarySummary,
      expenseSummary,
      recentCollections,
      defaulters,
      recentActivity,
      generatedAt: now.toISOString(),
    };
  },

  /** Fee defaulters grouped by class-section — up to 1000 outstanding records, grouped in memory. */
  async getGroupedDefaulters(ctx: AuthContext): Promise<ClassDefaulterGroup[]> {
    const today = startOfDay(new Date());
    const outstanding = await feeRepository.findOutstanding(ctx.schoolId, { page: 1, limit: 1000 });

    const groups = new Map<string, ClassDefaulterGroup>();
    for (const rec of outstanding.records) {
      const key = `${rec.class}||${rec.section}`;
      const defaulter = toFeeDefaulter(rec, today);
      const existing = groups.get(key);
      if (existing) {
        existing.students.push(defaulter);
        existing.totalBalance += defaulter.balance;
      } else {
        groups.set(key, {
          class: rec.class,
          section: rec.section,
          totalBalance: defaulter.balance,
          students: [defaulter],
        });
      }
    }

    return Array.from(groups.values()).sort((a, b) =>
      `${a.class}${a.section}`.localeCompare(`${b.class}${b.section}`, undefined, { numeric: true }),
    );
  },

  /** Emails a class's fee defaulters list to a teacher via the existing automation/EMAIL channel. */
  async sendDefaultersToTeacher(rawInput: unknown, ctx: AuthContext): Promise<void> {
    const input = sendDefaultersToTeacherSchema.parse(rawInput);

    const teacher = await teacherRepository.findById(input.teacherId, ctx.schoolId);
    if (!teacher) throw new NotFoundError('Teacher');
    if (!teacher.email) throw new ValidationError('This teacher has no email on file. Add one from Teacher Management first.');

    const today = startOfDay(new Date());
    const outstanding = await feeRepository.findOutstanding(ctx.schoolId, {
      class: input.class, section: input.section, page: 1, limit: 500,
    });
    if (!outstanding.records.length) {
      throw new ValidationError(`No pending fees found for Class ${input.class}-${input.section}.`);
    }

    const students = outstanding.records.map((rec) => toFeeDefaulter(rec, today));
    const totalBalance = students.reduce((sum, s) => sum + s.balance, 0);

    await automationService.dispatch({
      type: 'EMAIL',
      payload: {
        to: teacher.email,
        subject: `Fee Defaulters — Class ${input.class}-${input.section}`,
        studentCount: students.length,
        totalBalance,
        students: students.map((s) => ({
          name: s.studentName, balance: s.balance, dueDate: s.dueDate, daysOverdue: s.daysOverdue,
        })),
        triggeredByName: ctx.displayName,
      },
      referenceType: 'custom',
      triggeredBy: ctx.userId,
      schoolId: ctx.schoolId,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.defaulters_emailed', resource: 'fees', resourceId: `${input.class}-${input.section}`,
      details: { teacherId: input.teacherId, teacherEmail: teacher.email, studentCount: students.length, totalBalance },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  /** Emails a payment receipt via the existing automation/EMAIL channel. */
  async sendReceiptEmail(rawInput: unknown, ctx: AuthContext): Promise<void> {
    const input = sendReceiptEmailSchema.parse(rawInput);

    await automationService.dispatch({
      type: 'EMAIL',
      payload: {
        to: input.toEmail,
        subject: `Fee Receipt — ${input.studentName}`,
        studentName: input.studentName,
        class: input.class,
        section: input.section,
        feeDescription: input.feeDescription,
        amount: input.amount,
        paymentDate: input.paymentDate,
        triggeredByName: ctx.displayName,
      },
      referenceType: 'custom',
      triggeredBy: ctx.userId,
      schoolId: ctx.schoolId,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.receipt_emailed', resource: 'fees', resourceId: input.toEmail,
      details: { studentName: input.studentName, amount: input.amount },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
