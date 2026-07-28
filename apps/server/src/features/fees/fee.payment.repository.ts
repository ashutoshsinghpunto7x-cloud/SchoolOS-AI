import { ClientSession } from 'mongoose';
import { FeePayment, IFeePayment } from './fee.payment.model';
import type { PaymentMode } from './fee.model';
import { nextSequence } from '../../lib/counter.model';

export interface RecentCollection {
  feeRecordId: string;
  paymentId: string;
  studentName: string;
  class: string;
  section: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: Date;
  createdAt: Date;
}

export interface CreatePaymentData {
  feeRecordId: string;
  studentId: string;
  schoolId: string;
  amount: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedById: string;
  recordedByName: string;
  receiptNumber: string;
  batchId?: string;
  idempotencyKey?: string;
}

export const feePaymentRepository = {
  async create(data: CreatePaymentData, session?: ClientSession): Promise<IFeePayment> {
    const payment = new FeePayment(data);
    return payment.save({ session });
  },

  /** Look up a payment by its client-supplied idempotency key, for replay-safe payment submission. */
  async findByIdempotencyKey(schoolId: string, idempotencyKey: string): Promise<IFeePayment | null> {
    return FeePayment.findOne({ schoolId, idempotencyKey, isDeleted: false }).lean<IFeePayment>();
  },

  /**
   * Human-readable, sequential receipt/bill number: RCPT-{academicYear digits}-{5-digit running total}.
   * Sequence is a total count of payments ever recorded for the school (not reset per day/year) so it
   * stays unique and monotonically increasing even if generated concurrently across academic years.
   *
   * Backed by the shared atomic `Counter` ($inc — never a read-then-write race), not
   * countDocuments()+1: two concurrent payments used to be able to read the same count and both
   * compute the same "next" number, tripping the unique index and aborting one payment's transaction
   * under concurrent fee collection. Seeded from the current countDocuments() total only the first
   * time this school's counter is created, so numbers already issued under the old scheme are never
   * reused.
   */
  async generateReceiptNumber(schoolId: string, academicYear: string): Promise<string> {
    const seqNum = await nextSequence(
      `receiptNumber:${schoolId}`,
      () => FeePayment.countDocuments({ schoolId }),
    );
    const seq = String(seqNum).padStart(5, '0');
    const yearPart = academicYear.replace(/[^0-9]/g, '') || 'NA';
    return `RCPT-${yearPart}-${seq}`;
  },

  async findByReceiptNumber(schoolId: string, receiptNumber: string): Promise<IFeePayment | null> {
    return FeePayment.findOne({ schoolId, receiptNumber, isDeleted: false }).lean<IFeePayment>();
  },

  /** All payments sharing a multi-month collection's bill number, for printing a consolidated receipt. */
  async findByBatchId(schoolId: string, batchId: string): Promise<IFeePayment[]> {
    return FeePayment.find({ schoolId, batchId, isDeleted: false }).sort({ createdAt: 1 }).lean<IFeePayment[]>();
  },

  async findByFeeRecord(feeRecordId: string, schoolId: string): Promise<IFeePayment[]> {
    return FeePayment.find({ feeRecordId, schoolId, isDeleted: false })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean<IFeePayment[]>();
  },

  async findByStudent(studentId: string, schoolId: string): Promise<IFeePayment[]> {
    return FeePayment.find({ studentId, schoolId, isDeleted: false })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean<IFeePayment[]>();
  },

  async findById(id: string, schoolId: string): Promise<IFeePayment | null> {
    return FeePayment.findOne({ _id: id, schoolId, isDeleted: false }).lean<IFeePayment>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await FeePayment.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Sum of payments recorded (by createdAt, not the backdate-able paymentDate) within [start, end). */
  async getTotalCollectedBetween(schoolId: string, start: Date, end: Date): Promise<number> {
    const agg = await FeePayment.aggregate<{ total: number }>([
      { $match: { schoolId, isDeleted: false, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return agg[0]?.total ?? 0;
  },

  /** Most recent payments joined with their fee record for student/class display. */
  async getRecentWithStudent(schoolId: string, limit: number): Promise<RecentCollection[]> {
    const rows = await FeePayment.aggregate<{
      _id: unknown;
      feeRecordId: string;
      amount: number;
      paymentMode: PaymentMode;
      paymentDate: Date;
      createdAt: Date;
      feeRecord: { studentName: string; class: string; section: string }[];
    }>([
      { $match: { schoolId, isDeleted: false } },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'feerecords',
          let: { feeRecordId: { $toObjectId: '$feeRecordId' } },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$feeRecordId'] } } }],
          as: 'feeRecord',
        },
      },
    ]);

    return rows
      .filter((r) => r.feeRecord.length > 0)
      .map((r) => ({
        feeRecordId: r.feeRecordId,
        paymentId:   String(r._id),
        studentName: r.feeRecord[0].studentName,
        class:       r.feeRecord[0].class,
        section:     r.feeRecord[0].section,
        amount:      r.amount,
        paymentMode: r.paymentMode,
        paymentDate: r.paymentDate,
        createdAt:   r.createdAt,
      }));
  },
};
