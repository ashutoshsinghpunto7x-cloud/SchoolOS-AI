import { feeRepository, PaginatedFees, FeeCollectionSummary, CreateFeeData } from './fee.repository';
import { feePaymentRepository } from './fee.payment.repository';
import { IFeeRecord } from './fee.model';
import { IFeePayment } from './fee.payment.model';
import {
  createFeeRecordSchema,
  updateFeeRecordSchema,
  recordPaymentSchema,
  listFeesSchema,
  studentFeesSchema,
  outstandingSchema,
} from './fee.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { studentRepository } from '../students/student.repository';

// ── Service ───────────────────────────────────────────────────────────────────

export const feeService = {
  async createFeeRecord(rawInput: unknown, ctx: AuthContext): Promise<IFeeRecord> {
    const data = createFeeRecordSchema.parse(rawInput);

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const discountAmount = data.discountAmount ?? 0;
    const balance = data.totalAmount - discountAmount;
    if (balance < 0) throw new ValidationError('Discount cannot exceed total amount');

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
    const newBalance     = Math.max(0, totalAmount - discountAmount - waivedAmount - existing.paidAmount);

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

    const payment = await feePaymentRepository.create({
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
    });

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

    return { record: updatedRecord, payment };
  },

  async getOutstanding(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedFees> {
    const opts = outstandingSchema.parse(rawQuery);
    return feeRepository.findOutstanding(ctx.schoolId, opts);
  },

  async getSummary(ctx: AuthContext, academicYear?: string): Promise<FeeCollectionSummary> {
    return feeRepository.getSummary(ctx.schoolId, { academicYear });
  },
};
