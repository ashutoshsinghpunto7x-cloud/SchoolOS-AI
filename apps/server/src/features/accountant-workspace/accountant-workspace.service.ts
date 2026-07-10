import { feeRepository } from '../fees/fee.repository';
import { feePaymentRepository } from '../fees/fee.payment.repository';
import { feeService } from '../fees/fee.service';
import { salaryRepository } from '../salary/salary.repository';
import { expenseRepository } from '../expenses/expense.repository';
import { teacherRepository } from '../teachers/teacher.repository';
import { classTeacherRepository } from '../classes/class-teacher.repository';
import { studentRepository } from '../students/student.repository';
import { automationService } from '../automation/automation.service';
import { notificationService } from '../notifications/notification.service';
import { auditService } from '../audit/audit.service';
import { AuditLog } from '../audit/audit.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import {
  sendDefaultersToTeacherSchema,
  sendReceiptEmailSchema,
  studentLedgerParamsSchema,
  classFeeSummaryParamsSchema,
} from './accountant-workspace.validation';
import type {
  AccountantDashboardData,
  RecentFeeCollection,
  FeeDefaulter,
  AccountingActivityEntry,
  ClassDefaulterGroup,
  StudentLedgerData,
  ClassFeeSummary,
  ClassFeeStudentRow,
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
    feeHead:     rec.feeHead,
    description: rec.description,
    balance:     rec.balance,
    dueDate:     rec.dueDate.toISOString(),
    daysOverdue: daysBetween(today, startOfDay(rec.dueDate)),
  };
}

export const accountantWorkspaceService = {
  async getDashboard(ctx: AuthContext): Promise<AccountantDashboardData> {
    await feeService.ensureOverdueMarked();
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
    await feeService.ensureOverdueMarked();
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

    const groupList = Array.from(groups.values());
    const assignments = await classTeacherRepository.findAll(ctx.schoolId);
    const assignmentMap = new Map(assignments.map((a) => [`${a.class}||${a.section}`, a]));
    for (const group of groupList) {
      const assignment = assignmentMap.get(`${group.class}||${group.section}`);
      if (assignment) {
        group.classTeacherId = assignment.teacherId;
        group.classTeacherName = assignment.teacherName;
      }
    }

    return groupList.sort((a, b) =>
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

    // Also deliver as an in-app notification if the teacher has a linked login account.
    await notificationService.sendToTeachers(
      {
        teacherIds: [input.teacherId],
        type: 'defaulters_list',
        title: `Fee Defaulters — Class ${input.class}-${input.section}`,
        body: `${students.length} student${students.length === 1 ? '' : 's'} with a combined outstanding balance of ₹${totalBalance.toLocaleString('en-IN')}.`,
        payload: { class: input.class, section: input.section, students },
      },
      ctx,
    );

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

  /** Full financial picture for one student: profile + every fee record + every payment, with computed totals. */
  async getStudentLedger(rawParams: unknown, ctx: AuthContext): Promise<StudentLedgerData> {
    const { studentId } = studentLedgerParamsSchema.parse(rawParams);

    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const [feeRecords, payments] = await Promise.all([
      feeRepository.findByStudent(ctx.schoolId, studentId),
      feePaymentRepository.findByStudent(studentId, ctx.schoolId),
    ]);

    const summary = feeRecords.reduce(
      (acc, rec) => {
        acc.totalFees += rec.totalAmount;
        acc.totalPaid += rec.paidAmount;
        acc.totalDiscount += rec.discountAmount;
        acc.totalFine += rec.fineAmount;
        acc.totalWaived += rec.waivedAmount;
        acc.remainingBalance += rec.balance;
        return acc;
      },
      { totalFees: 0, totalPaid: 0, totalDiscount: 0, totalFine: 0, totalWaived: 0, remainingBalance: 0 },
    );

    const sortedPayments = [...payments].sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    );

    return {
      student: student as unknown as StudentLedgerData['student'],
      feeRecords: feeRecords as unknown as StudentLedgerData['feeRecords'],
      payments: sortedPayments as unknown as StudentLedgerData['payments'],
      summary: {
        ...summary,
        netAmount: summary.totalFees + summary.totalFine - summary.totalDiscount - summary.totalWaived,
        lastPaymentDate: sortedPayments[0]?.paymentDate.toISOString(),
      },
    };
  },

  /** Every student in a class+section, roll-number ordered, with their overall fee
   * balance across every fee head — the "Browse by Class" view on Fee Records. */
  async getClassFeeSummary(rawParams: unknown, ctx: AuthContext): Promise<ClassFeeSummary> {
    const { class: klass, section } = classFeeSummaryParamsSchema.parse(rawParams);

    const [{ students }, feeRecords] = await Promise.all([
      studentRepository.findAll(ctx.schoolId, { class: klass, section, status: 'active', limit: 500 }),
      feeRepository.findByClassSection(ctx.schoolId, klass, section),
    ]);

    const byStudent = new Map<string, { totalCharged: number; totalPaid: number; balance: number }>();
    for (const rec of feeRecords) {
      const agg = byStudent.get(rec.studentId) ?? { totalCharged: 0, totalPaid: 0, balance: 0 };
      agg.totalCharged += rec.totalAmount + rec.fineAmount;
      agg.totalPaid += rec.paidAmount;
      agg.balance += rec.balance;
      byStudent.set(rec.studentId, agg);
    }

    const rows: ClassFeeStudentRow[] = students.map((s) => {
      const id = String((s as unknown as { _id: { toString(): string } })._id);
      const agg = byStudent.get(id);
      return {
        studentId: id,
        fullName: s.fullName,
        admissionNumber: s.admissionNumber,
        rollNumber: s.rollNumber,
        totalCharged: agg?.totalCharged ?? 0,
        totalPaid: agg?.totalPaid ?? 0,
        balance: agg?.balance ?? 0,
        status: !agg ? 'no_records' : agg.balance > 0.01 ? 'due' : 'paid',
      };
    });

    rows.sort((a, b) => {
      const an = parseInt(a.rollNumber ?? '', 10);
      const bn = parseInt(b.rollNumber ?? '', 10);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      if (!Number.isNaN(an)) return -1;
      if (!Number.isNaN(bn)) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    return { class: klass, section, students: rows };
  },

  /** WhatsApp fee reminder to the guardian's phone via the existing automation/WHATSAPP channel. */
  async sendLedgerWhatsAppReminder(rawParams: unknown, ctx: AuthContext): Promise<void> {
    const { studentId } = studentLedgerParamsSchema.parse(rawParams);
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    if (!student.parentPhone) throw new ValidationError('This student has no guardian phone number on file.');

    const feeRecords = await feeRepository.findByStudent(ctx.schoolId, studentId);
    const balance = feeRecords.reduce((sum, r) => sum + r.balance, 0);
    if (balance <= 0) throw new ValidationError('This student has no outstanding balance.');

    await automationService.dispatch({
      type: 'WHATSAPP',
      payload: {
        to: student.parentPhone,
        studentName: student.fullName,
        class: student.class,
        section: student.section,
        balance,
        triggeredByName: ctx.displayName,
      },
      referenceType: 'custom',
      triggeredBy: ctx.userId,
      schoolId: ctx.schoolId,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.reminder_sent', resource: 'fees', resourceId: studentId,
      details: { channel: 'whatsapp', phone: student.parentPhone, balance },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  /** Emails the full fee ledger statement to the guardian/student via the existing automation/EMAIL channel. */
  async sendLedgerStatementEmail(rawParams: unknown, ctx: AuthContext): Promise<void> {
    const { studentId } = studentLedgerParamsSchema.parse(rawParams);
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    if (!student.email) throw new ValidationError('This student has no email on file.');

    const feeRecords = await feeRepository.findByStudent(ctx.schoolId, studentId);
    const totalFees = feeRecords.reduce((sum, r) => sum + r.totalAmount + r.fineAmount, 0);
    const totalPaid = feeRecords.reduce((sum, r) => sum + r.paidAmount, 0);
    const balance = feeRecords.reduce((sum, r) => sum + r.balance, 0);

    await automationService.dispatch({
      type: 'EMAIL',
      payload: {
        to: student.email,
        subject: `Fee Statement — ${student.fullName}`,
        studentName: student.fullName,
        class: student.class,
        section: student.section,
        totalFees,
        totalPaid,
        balance,
        triggeredByName: ctx.displayName,
      },
      referenceType: 'custom',
      triggeredBy: ctx.userId,
      schoolId: ctx.schoolId,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.statement_emailed', resource: 'fees', resourceId: studentId,
      details: { email: student.email, balance },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
