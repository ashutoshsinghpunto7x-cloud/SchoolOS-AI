import { feeRepository, PaginatedFees, FeeCollectionSummary, CreateFeeData } from './fee.repository';
import { feePaymentRepository } from './fee.payment.repository';
import { IFeeRecord } from './fee.model';
import { IFeePayment } from './fee.payment.model';
import {
  createFeeRecordSchema,
  updateFeeRecordSchema,
  recordPaymentSchema,
  recordBulkPaymentSchema,
  listFeesSchema,
  studentFeesSchema,
  outstandingSchema,
} from './fee.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { studentRepository } from '../students/student.repository';

// ── Academic-year month helpers (Indian school year: April → March) ────────────

const ACADEMIC_MONTH_ORDER = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March',
];

/** Given "April".."March" + "2025-26", work out the next month + its academic year + calendar year. */
function nextAcademicMonth(month: string, academicYear: string): { month: string; academicYear: string; calendarYear: number } | null {
  const idx = ACADEMIC_MONTH_ORDER.indexOf(month);
  const startYear = parseInt(academicYear.slice(0, 4), 10);
  if (idx === -1 || Number.isNaN(startYear)) return null;

  const nextIdx = (idx + 1) % 12;
  const nextMonth = ACADEMIC_MONTH_ORDER[nextIdx];
  const rollsOver = idx === 11; // March → April of the next academic year
  const nextAcademicYear = rollsOver
    ? `${startYear + 1}-${String(startYear + 2).slice(-2)}`
    : academicYear;
  // April..December fall in startYear; January..March fall in startYear + 1.
  const calendarYear = nextIdx <= 8 ? (rollsOver ? startYear + 1 : startYear) : startYear + 1;

  return { month: nextMonth, academicYear: nextAcademicYear, calendarYear };
}

function calendarMonthIndex(month: string): number {
  // JS Date months are 0-indexed, calendar order (not academic order).
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Overdue sweep ────────────────────────────────────────────────────────────
// The server may run serverless (Vercel), so a persistent setInterval cron isn't
// reliable — instead, opportunistically flip pending/partial fees past their due
// date to 'overdue' whenever outstanding/summary/defaulter data is read, throttled
// to once/hour per instance so it doesn't run on every request.

let lastOverdueSweep = 0;
async function ensureOverdueMarked(): Promise<void> {
  const now = Date.now();
  if (now - lastOverdueSweep < 60 * 60 * 1000) return;
  lastOverdueSweep = now;
  await feeRepository.markOverdue(new Date()).catch(() => {});
}

// ── Service ───────────────────────────────────────────────────────────────────

export const feeService = {
  /** Exposed so other features (e.g. the accountant dashboard's defaulters view) can trigger the same sweep before reading. */
  ensureOverdueMarked,

  async createFeeRecord(rawInput: unknown, ctx: AuthContext): Promise<IFeeRecord> {
    const data = createFeeRecordSchema.parse(rawInput);

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const discountAmount = data.discountAmount ?? 0;
    const fineAmount = data.fineAmount ?? 0;
    const balance = data.totalAmount + fineAmount - discountAmount;
    if (balance < 0) throw new ValidationError('Discount cannot exceed total amount + fine');

    const createData: CreateFeeData = {
      studentId:       data.studentId,
      studentName:     student.fullName,
      admissionNumber: student.admissionNumber,
      class:           student.class,
      section:         student.section,
      schoolId:        ctx.schoolId,
      feeHead:         data.feeHead,
      customHead:      data.customHead,
      description:     data.description,
      academicYear:    data.academicYear,
      month:           data.month,
      dueDate:         new Date(data.dueDate),
      totalAmount:     data.totalAmount,
      discountAmount,
      discountReason:  data.discountReason,
      waivedAmount:    0,
      fineAmount,
      fineReason:      data.fineReason,
      paidAmount:      0,
      balance,
      status:          'pending',
      notes:           data.notes,
      createdBy:       ctx.displayName,
    };
    const record = await feeRepository.create(createData);

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'fee.created',
      resource:        'fees',
      resourceId:      record._id.toString(),
      details:         { studentId: data.studentId, feeHead: data.feeHead, totalAmount: data.totalAmount },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return record;
  },

  async listFeeRecords(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedFees> {
    const opts = listFeesSchema.parse(rawQuery);
    return feeRepository.findAll(ctx.schoolId, opts);
  },

  async getFeeRecord(
    id: string,
    ctx: AuthContext,
  ): Promise<{ record: IFeeRecord; payments: IFeePayment[] }> {
    const record = await feeRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Fee record');
    const payments = await feePaymentRepository.findByFeeRecord(id, ctx.schoolId);
    return { record, payments };
  },

  async getStudentFees(
    studentId: string,
    rawQuery: unknown,
    ctx: AuthContext,
  ): Promise<IFeeRecord[]> {
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    const opts = studentFeesSchema.parse(rawQuery);
    return feeRepository.findByStudent(ctx.schoolId, studentId, opts);
  },

  async updateFeeRecord(id: string, rawInput: unknown, ctx: AuthContext): Promise<IFeeRecord> {
    const data = updateFeeRecordSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const existing = await feeRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Fee record');

    // Recompute balance if amounts are being updated
    const totalAmount    = data.totalAmount    ?? existing.totalAmount;
    const discountAmount = data.discountAmount ?? existing.discountAmount;
    const waivedAmount   = data.waivedAmount   ?? existing.waivedAmount;
    const fineAmount     = data.fineAmount     ?? existing.fineAmount;
    const newBalance     = Math.max(0, totalAmount + fineAmount - discountAmount - waivedAmount - existing.paidAmount);

    const update: Partial<IFeeRecord> & { updatedBy: string } = {
      ...data,
      dueDate:    data.dueDate ? new Date(data.dueDate) : undefined,
      balance:    newBalance,
      updatedBy:  ctx.displayName,
    };

    const record = await feeRepository.update(id, ctx.schoolId, update);
    if (!record) throw new NotFoundError('Fee record');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'fee.updated',
      resource:        'fees',
      resourceId:      id,
      details:         { fields: Object.keys(data) },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return record;
  },

  async deleteFeeRecord(id: string, ctx: AuthContext): Promise<void> {
    const existing = await feeRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Fee record');

    const deleted = await feeRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Fee record');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'fee.deleted',
      resource:        'fees',
      resourceId:      id,
      details:         { studentId: existing.studentId, feeHead: existing.feeHead },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },

  async recordPayment(
    rawInput: unknown,
    ctx: AuthContext,
  ): Promise<{ record: IFeeRecord; payment: IFeePayment }> {
    const data = recordPaymentSchema.parse(rawInput);

    const feeRecord = await feeRepository.findById(data.feeRecordId, ctx.schoolId);
    if (!feeRecord) throw new NotFoundError('Fee record');

    if (feeRecord.status === 'paid') {
      throw new ValidationError('This fee record is already fully paid');
    }
    if (feeRecord.status === 'waived') {
      throw new ValidationError('Cannot record payment against a waived fee');
    }
    if (data.amount > feeRecord.balance + 0.01) {
      // Allow 0.01 tolerance for floating-point
      throw new ValidationError(
        `Payment amount (₹${data.amount}) exceeds outstanding balance (₹${feeRecord.balance.toFixed(2)})`
      );
    }

    // Retry a couple of times in the rare case two payments race to the same
    // running-total receipt number (unique index rejects the duplicate).
    let payment: IFeePayment | undefined;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3 && !payment; attempt++) {
      const receiptNumber = await feePaymentRepository.generateReceiptNumber(ctx.schoolId, feeRecord.academicYear);
      try {
        payment = await feePaymentRepository.create({
          feeRecordId:    data.feeRecordId,
          studentId:      feeRecord.studentId,
          schoolId:       ctx.schoolId,
          amount:         data.amount,
          paymentDate:    new Date(data.paymentDate),
          paymentMode:    data.paymentMode,
          referenceNumber:data.referenceNumber,
          remarks:        data.remarks,
          recordedById:   ctx.userId,
          recordedByName: ctx.displayName,
          receiptNumber,
        });
      } catch (err) {
        lastErr = err;
      }
    }
    if (!payment) throw lastErr instanceof Error ? lastErr : new Error('Failed to record payment');

    const updatedRecord = await feeRepository.applyPayment(
      data.feeRecordId,
      ctx.schoolId,
      data.amount,
      ctx.displayName,
    );
    if (!updatedRecord) throw new NotFoundError('Fee record');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'fee.payment_recorded',
      resource:        'fees',
      resourceId:      data.feeRecordId,
      details:         {
        paymentId:   payment._id.toString(),
        amount:      data.amount,
        paymentMode: data.paymentMode,
        newStatus:   updatedRecord.status,
        newBalance:  updatedRecord.balance,
      },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    // Once a month's tuition fee is fully paid, line up next month's fee automatically
    // so the accountant doesn't have to re-create it by hand every month.
    if (updatedRecord.status === 'paid' && updatedRecord.feeHead === 'tuition') {
      await feeService.rollForwardTuitionFee(updatedRecord, ctx).catch(() => {});
    }

    return { record: updatedRecord, payment };
  },

  /** Create next month's tuition FeeRecord for a student once the current month is fully paid. No-op if already exists or no recurring amount is set. */
  async rollForwardTuitionFee(record: IFeeRecord, ctx: AuthContext): Promise<IFeeRecord | null> {
    if (!record.month) return null;
    const next = nextAcademicMonth(record.month, record.academicYear);
    if (!next) return null;

    const student = await studentRepository.findById(record.studentId, ctx.schoolId);
    if (!student?.monthlyTuitionFee) return null;

    const existing = await feeRepository.findByStudentAndMonth(
      ctx.schoolId, record.studentId, 'tuition', next.month, next.academicYear,
    );
    if (existing) return null;

    const dueDate = new Date(next.calendarYear, calendarMonthIndex(next.month), 10);
    // Never roll forward into a due date that's already in the past — this
    // happens when an accountant clears old arrears (paying several backdated
    // months at once); each one being marked 'paid' would otherwise spawn a
    // "next month" record that's born already overdue, showing up as a
    // confusing phantom pending fee even though everything was actually paid.
    if (dueDate.getTime() < startOfToday().getTime()) return null;
    // Carries forward any principal-approved standing discount so it applies
    // automatically to every future month, not just the record it was approved on.
    const discountAmount = student.approvedDiscountAmount ?? 0;
    const balance = Math.max(0, student.monthlyTuitionFee - discountAmount);

    return feeRepository.create({
      studentId:       student._id.toString(),
      studentName:     student.fullName,
      admissionNumber: student.admissionNumber,
      class:           student.class,
      section:         student.section,
      schoolId:        ctx.schoolId,
      feeHead:         'tuition',
      description:     `${next.month} Tuition Fee`,
      academicYear:    next.academicYear,
      month:           next.month,
      dueDate,
      totalAmount:     student.monthlyTuitionFee,
      discountAmount,
      discountReason:  student.approvedDiscountReason,
      waivedAmount:    0,
      fineAmount:      0,
      paidAmount:      0,
      balance,
      status:          'pending',
      createdBy:       'System (auto-recurring)',
    });
  },

  /**
   * Pay for several months in one go — covers arrears (unpaid past months), the
   * current month, and advance payments (future months), e.g. a full year at once.
   * Missing FeeRecords for future months are auto-created from the student's
   * monthlyTuitionFee. All payments share one printable batch bill number.
   */
  async recordBulkPayment(
    rawInput: unknown,
    ctx: AuthContext,
  ): Promise<{ batchId: string; results: { record: IFeeRecord; payment: IFeePayment }[] }> {
    const data = recordBulkPaymentSchema.parse(rawInput);

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const batchId = await feePaymentRepository.generateReceiptNumber(ctx.schoolId, data.months[0].academicYear);
    const results: { record: IFeeRecord; payment: IFeePayment }[] = [];

    for (const entry of data.months) {
      let feeRecord = await feeRepository.findByStudentAndMonth(
        ctx.schoolId, data.studentId, 'tuition', entry.month, entry.academicYear,
      );

      if (!feeRecord) {
        const amount = entry.amount ?? student.monthlyTuitionFee;
        if (!amount) throw new ValidationError(`No amount set for ${entry.month} — set a monthly tuition fee for this student first`);
        const dueDate = entry.dueDate
          ? new Date(entry.dueDate)
          : new Date(new Date().getFullYear(), calendarMonthIndex(entry.month), 10);
        const discountAmount = student.approvedDiscountAmount ?? 0;
        feeRecord = await feeRepository.create({
          studentId:       student._id.toString(),
          studentName:     student.fullName,
          admissionNumber: student.admissionNumber,
          class:           student.class,
          section:         student.section,
          schoolId:        ctx.schoolId,
          feeHead:         'tuition',
          description:     `${entry.month} Tuition Fee`,
          academicYear:    entry.academicYear,
          month:           entry.month,
          dueDate,
          totalAmount:     amount,
          discountAmount,
          discountReason:  student.approvedDiscountReason,
          waivedAmount:    0,
          fineAmount:      0,
          paidAmount:      0,
          balance:         Math.max(0, amount - discountAmount),
          status:          'pending',
          createdBy:       ctx.displayName,
        });
      }

      if (feeRecord.status === 'paid') continue; // skip months already settled
      const payAmount = Math.min(entry.amount, feeRecord.balance);
      if (payAmount <= 0) continue;

      const receiptNumber = await feePaymentRepository.generateReceiptNumber(ctx.schoolId, feeRecord.academicYear);
      const payment = await feePaymentRepository.create({
        feeRecordId:     feeRecord._id.toString(),
        studentId:       data.studentId,
        schoolId:        ctx.schoolId,
        amount:          payAmount,
        paymentDate:     new Date(data.paymentDate),
        paymentMode:     data.paymentMode,
        referenceNumber: data.referenceNumber,
        remarks:         data.remarks,
        recordedById:    ctx.userId,
        recordedByName:  ctx.displayName,
        receiptNumber,
        batchId,
      });

      const updatedRecord = await feeRepository.applyPayment(
        feeRecord._id.toString(), ctx.schoolId, payAmount, ctx.displayName,
      );
      if (!updatedRecord) continue;

      // Deliberately no rollForwardTuitionFee() here (unlike the single-month
      // recordPayment path above) — a bulk payment already lets the accountant
      // explicitly pick which future months to prepay. Auto-rolling forward
      // per-month inside this loop meant paying off the academic year's last
      // month (e.g. March) immediately spawned next year's April as a new
      // 'pending' record, which the ledger shows only by month name (no year)
      // — reading as "April is pending again" right after April was paid.
      results.push({ record: updatedRecord, payment });
    }

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'fee.bulk_payment_recorded',
      resource:        'fees',
      resourceId:      data.studentId,
      details:         { batchId, months: data.months.map((m) => m.month), count: results.length },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return { batchId, results };
  },

  async getOutstanding(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedFees> {
    await ensureOverdueMarked();
    const opts = outstandingSchema.parse(rawQuery);
    return feeRepository.findOutstanding(ctx.schoolId, {
      class:   opts.class,
      section: opts.section,
      feeHead: opts.feeHead,
      page:    opts.page,
      limit:   opts.limit,
    });
  },

  async getSummary(ctx: AuthContext, academicYear?: string): Promise<FeeCollectionSummary> {
    await ensureOverdueMarked();
    return feeRepository.getSummary(ctx.schoolId, { academicYear });
  },

  /** Look up a payment (and its fee record/month) by the receipt/bill number printed on a receipt. */
  async getPaymentByReceipt(
    receiptNumber: string,
    ctx: AuthContext,
  ): Promise<{ record: IFeeRecord; payment: IFeePayment }> {
    const payment = await feePaymentRepository.findByReceiptNumber(ctx.schoolId, receiptNumber.trim());
    if (!payment) throw new NotFoundError('Receipt');

    const record = await feeRepository.findById(payment.feeRecordId, ctx.schoolId);
    if (!record) throw new NotFoundError('Fee record');

    return { record, payment };
  },
};
