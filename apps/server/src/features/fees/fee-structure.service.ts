import { feeStructureRepository } from './fee-structure.repository';
import { feeDiscountRequestRepository } from './fee-discount-request.repository';
import { feeRepository } from './fee.repository';
import { studentRepository } from '../students/student.repository';
import { ACADEMIC_MONTH_ORDER, calendarMonthIndex } from './fee.service';
import {
  upsertFeeStructureSchema, createDiscountRequestSchema, reviewDiscountRequestSchema,
} from './fee-structure.validation';
import { IFeeStructure } from './fee-structure.model';
import { IFeeDiscountRequest } from './fee-discount-request.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

/** A given academic month + "2024-25" → the actual calendar due date (10th of
 *  that month) — April..December fall in the year the academic year starts,
 *  January..March fall in the year after. A null month (a "whole year" head
 *  like Transport) is due at the very start of the academic year instead. */
function resolveDueDate(month: string | null, academicYear: string): Date {
  const startYear = parseInt(academicYear.slice(0, 4), 10);
  if (!month) return new Date(startYear, 3, 10); // April 10
  const idx = ACADEMIC_MONTH_ORDER.indexOf(month);
  const calendarYear = idx <= 8 ? startYear : startYear + 1;
  return new Date(calendarYear, calendarMonthIndex(month), 10);
}

export const feeStructureService = {
  // ── Class Fee Structure ───────────────────────────────────────────────────

  async list(schoolId: string, academicYear?: string): Promise<IFeeStructure[]> {
    return feeStructureRepository.findAll(schoolId, academicYear);
  },

  /**
   * Saving an amount here isn't just a pricing-catalog edit — it immediately
   * creates or updates the actual billing record for every active student in
   * the class, so the Student Fee Ledger shows the new category right away
   * instead of the accountant having to separately "generate" anything.
   * Settled (paid/waived) records are never touched.
   */
  async upsert(rawInput: unknown, ctx: AuthContext): Promise<IFeeStructure> {
    const data = upsertFeeStructureSchema.parse(rawInput);
    const month = data.month ?? null;
    const structure = await feeStructureRepository.upsert(
      ctx.schoolId, data.class, data.feeHead, data.academicYear, month, data.amount, ctx.displayName,
    );

    const [students, existingRecords] = await Promise.all([
      studentRepository.findActiveByClass(ctx.schoolId, data.class),
      feeRepository.findByClassFeeHead(ctx.schoolId, data.class, data.feeHead, data.academicYear, month),
    ]);
    const existingByStudent = new Map(existingRecords.map((r) => [r.studentId, r]));
    const dueDate = resolveDueDate(month, data.academicYear);

    let created = 0;
    let updated = 0;

    for (const student of students) {
      const studentId = String(student._id);
      const existing = existingByStudent.get(studentId);

      if (existing) {
        if (existing.status === 'paid' || existing.status === 'waived') continue;
        const newBalance = Math.max(0, data.amount + existing.fineAmount - existing.discountAmount - existing.waivedAmount - existing.paidAmount);
        await feeRepository.update(String((existing as unknown as { _id: { toString(): string } })._id), ctx.schoolId, {
          totalAmount: data.amount,
          balance: newBalance,
          status: newBalance === 0 ? 'paid' : existing.status,
          updatedBy: ctx.displayName,
        });
        updated++;
      } else {
        await feeRepository.create({
          studentId,
          studentName: student.fullName,
          admissionNumber: student.admissionNumber ?? '',
          class: student.class,
          section: student.section,
          schoolId: ctx.schoolId,
          feeHead: data.feeHead,
          academicYear: data.academicYear,
          month: month ?? undefined,
          dueDate,
          totalAmount: data.amount,
          discountAmount: 0,
          waivedAmount: 0,
          fineAmount: 0,
          paidAmount: 0,
          balance: data.amount,
          status: 'pending',
          createdBy: ctx.displayName,
        });
        created++;
      }
    }

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.updated', resource: 'fee_structure', resourceId: `${data.class}-${data.feeHead}-${data.academicYear}`,
      details: { class: data.class, feeHead: data.feeHead, amount: data.amount, month, recordsCreated: created, recordsUpdated: updated },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return structure;
  },

  async remove(id: string, ctx: AuthContext): Promise<void> {
    const deleted = await feeStructureRepository.remove(id, ctx.schoolId);
    if (!deleted) throw new NotFoundError('Fee structure entry');
  },

  // ── Discount Approval ──────────────────────────────────────────────────────

  async listPendingDiscounts(schoolId: string): Promise<IFeeDiscountRequest[]> {
    return feeDiscountRequestRepository.findPending(schoolId);
  },

  async listStudentDiscounts(studentId: string, ctx: AuthContext): Promise<IFeeDiscountRequest[]> {
    return feeDiscountRequestRepository.findByStudent(ctx.schoolId, studentId);
  },

  /** Accountant submits a discount for a student — takes effect only once the principal approves it, never immediately. */
  async createDiscountRequest(rawInput: unknown, ctx: AuthContext): Promise<IFeeDiscountRequest> {
    const data = createDiscountRequestSchema.parse(rawInput);

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const alreadyPending = await feeDiscountRequestRepository.hasPending(ctx.schoolId, data.studentId);
    if (alreadyPending) throw new ValidationError('This student already has a discount request awaiting approval.');

    const request = await feeDiscountRequestRepository.create({
      schoolId: ctx.schoolId,
      studentId: data.studentId,
      studentName: student.fullName,
      class: student.class,
      section: student.section,
      requestedAmount: data.requestedAmount,
      reason: data.reason,
      requestedByName: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.discount_requested', resource: 'fee_discount_requests', resourceId: String((request as unknown as { _id: { toString(): string } })._id),
      details: { studentId: data.studentId, requestedAmount: data.requestedAmount },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return request;
  },

  /**
   * Approving sets the student's standing discount (applied automatically to
   * every future auto-generated fee record) and immediately re-discounts any
   * currently outstanding fee records — so the very next collection already
   * shows the decided amount, per the accountant/principal workflow.
   */
  async approveDiscountRequest(id: string, rawInput: unknown, ctx: AuthContext): Promise<IFeeDiscountRequest> {
    const { reviewNote } = reviewDiscountRequestSchema.parse(rawInput);

    const request = await feeDiscountRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Discount request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');

    const updated = await feeDiscountRequestRepository.markApproved(id, ctx.displayName, reviewNote);
    if (!updated) throw new NotFoundError('Discount request');

    await studentRepository.updateApprovedDiscount(request.studentId, ctx.schoolId, request.requestedAmount, request.reason);

    // Re-discount currently outstanding fee records for this student so the
    // decided amount is reflected right away, not just for future months.
    const outstanding = await feeRepository.findByStudent(ctx.schoolId, request.studentId, {});
    for (const record of outstanding) {
      if (record.status === 'paid' || record.status === 'waived') continue;
      const newBalance = Math.max(0, record.totalAmount + record.fineAmount - request.requestedAmount - record.waivedAmount - record.paidAmount);
      await feeRepository.update(String((record as unknown as { _id: { toString(): string } })._id), ctx.schoolId, {
        discountAmount: request.requestedAmount,
        discountReason: request.reason,
        balance: newBalance,
        status: newBalance === 0 ? 'paid' : record.status,
        updatedBy: ctx.displayName,
      });
    }

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.discount_approved', resource: 'fee_discount_requests', resourceId: id,
      details: { studentId: request.studentId, amount: request.requestedAmount },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async rejectDiscountRequest(id: string, rawInput: unknown, ctx: AuthContext): Promise<IFeeDiscountRequest> {
    const { reviewNote } = reviewDiscountRequestSchema.parse(rawInput);

    const request = await feeDiscountRequestRepository.findById(id, ctx.schoolId);
    if (!request) throw new NotFoundError('Discount request');
    if (request.status !== 'pending') throw new ValidationError('This request has already been reviewed.');

    const updated = await feeDiscountRequestRepository.markRejected(id, ctx.displayName, reviewNote);
    if (!updated) throw new NotFoundError('Discount request');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.discount_rejected', resource: 'fee_discount_requests', resourceId: id,
      details: { studentId: request.studentId },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },
};
