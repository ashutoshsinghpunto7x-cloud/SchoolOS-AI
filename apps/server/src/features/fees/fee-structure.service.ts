import { feeStructureRepository } from './fee-structure.repository';
import { feeDiscountRequestRepository } from './fee-discount-request.repository';
import { feeRepository } from './fee.repository';
import { studentRepository } from '../students/student.repository';
import {
  upsertFeeStructureSchema, createDiscountRequestSchema, reviewDiscountRequestSchema,
} from './fee-structure.validation';
import { IFeeStructure } from './fee-structure.model';
import { IFeeDiscountRequest } from './fee-discount-request.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export const feeStructureService = {
  // ── Class Fee Structure ───────────────────────────────────────────────────

  async list(schoolId: string, academicYear?: string): Promise<IFeeStructure[]> {
    return feeStructureRepository.findAll(schoolId, academicYear);
  },

  async upsert(rawInput: unknown, ctx: AuthContext): Promise<IFeeStructure> {
    const data = upsertFeeStructureSchema.parse(rawInput);
    const structure = await feeStructureRepository.upsert(
      ctx.schoolId, data.class, data.feeHead, data.academicYear, data.amount, ctx.displayName,
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'fee.updated', resource: 'fee_structure', resourceId: `${data.class}-${data.feeHead}-${data.academicYear}`,
      details: { class: data.class, feeHead: data.feeHead, amount: data.amount },
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
