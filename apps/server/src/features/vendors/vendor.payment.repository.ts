import { ClientSession } from 'mongoose';
import { VendorPayment, IVendorPayment } from './vendor.payment.model';
import type { PaymentMode } from '../fees/fee.model';
import { nextSequence } from '../../lib/counter.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateVendorPaymentData {
  vendorId: string;
  billId?: string;
  schoolId: string;
  amount: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  recordedById: string;
  recordedByName: string;
  receiptNumber: string;
  idempotencyKey?: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const vendorPaymentRepository = {
  async create(data: CreateVendorPaymentData, session?: ClientSession): Promise<IVendorPayment> {
    const payment = new VendorPayment(data);
    return payment.save({ session });
  },

  async findByIdempotencyKey(schoolId: string, idempotencyKey: string): Promise<IVendorPayment | null> {
    return VendorPayment.findOne({ schoolId, idempotencyKey, isDeleted: false }).lean<IVendorPayment>();
  },

  /** Human-readable, sequential payment number: VPAY-{5-digit running total}. Backed by the shared
   *  atomic Counter — same pattern as feePaymentRepository.generateReceiptNumber. */
  async generateReceiptNumber(schoolId: string): Promise<string> {
    const seqNum = await nextSequence(
      `vendorPaymentReceiptNumber:${schoolId}`,
      () => VendorPayment.countDocuments({ schoolId }),
    );
    return `VPAY-${String(seqNum).padStart(5, '0')}`;
  },

  async findByVendor(vendorId: string, schoolId: string): Promise<IVendorPayment[]> {
    return VendorPayment.find({ vendorId, schoolId, isDeleted: false })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean<IVendorPayment[]>();
  },

  async findByBill(billId: string, schoolId: string): Promise<IVendorPayment[]> {
    return VendorPayment.find({ billId, schoolId, isDeleted: false })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean<IVendorPayment[]>();
  },

  async findById(id: string, schoolId: string): Promise<IVendorPayment | null> {
    return VendorPayment.findOne({ _id: id, schoolId, isDeleted: false }).lean<IVendorPayment>();
  },

  /** Payment-mode split (by createdAt) within [start, end) — feeds the dashboard's net cash/bank position. */
  async getModeSplitBetween(schoolId: string, start: Date, end: Date): Promise<Record<PaymentMode, number>> {
    const agg = await VendorPayment.aggregate<{ _id: PaymentMode; total: number }>([
      { $match: { schoolId, isDeleted: false, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$paymentMode', total: { $sum: '$amount' } } },
    ]);
    const result: Record<PaymentMode, number> = {
      cash: 0, upi: 0, sse_upi: 0, online: 0, sse_online: 0, challan: 0, cheque: 0, bank_transfer: 0, demand_draft: 0, card: 0,
    };
    for (const row of agg) result[row._id] = row.total;
    return result;
  },
};
