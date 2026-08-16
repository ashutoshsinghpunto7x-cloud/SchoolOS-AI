import { ClientSession } from 'mongoose';
import { VendorBill, IVendorBill, VendorBillStatus } from './vendor.bill.model';
import type { VendorCategory } from './vendor.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindVendorBillsOptions {
  page?: number;
  limit?: number;
  status?: VendorBillStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedVendorBills {
  records: IVendorBill[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateVendorBillData {
  schoolId: string;
  vendorId: string;
  vendorName: string;
  billNumber?: string;
  description: string;
  category: VendorCategory;
  amount: number;
  billDate: Date;
  dueDate?: Date;
  notes?: string;
  createdBy: string;
}

export interface VendorBillSummary {
  totalUnpaid: number;
  totalPartiallyPaid: number;
  totalPaid: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  paidCount: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const vendorBillRepository = {
  async create(data: CreateVendorBillData): Promise<IVendorBill> {
    const bill = new VendorBill({ ...data, paidAmount: 0, balance: data.amount, status: 'unpaid' });
    return bill.save();
  },

  async findById(id: string, schoolId: string): Promise<IVendorBill | null> {
    return VendorBill.findOne({ _id: id, schoolId, isDeleted: false }).lean<IVendorBill>();
  },

  async findByVendor(vendorId: string, schoolId: string): Promise<IVendorBill[]> {
    return VendorBill.find({ vendorId, schoolId, isDeleted: false })
      .sort({ billDate: -1, createdAt: -1 })
      .lean<IVendorBill[]>();
  },

  async findAll(schoolId: string, opts: FindVendorBillsOptions = {}): Promise<PaginatedVendorBills> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.status) query.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, Date> = {};
      if (opts.dateFrom) dateRange.$gte = new Date(opts.dateFrom);
      if (opts.dateTo)   dateRange.$lte = new Date(opts.dateTo);
      query.billDate = dateRange;
    }

    const [records, total] = await Promise.all([
      VendorBill.find(query).sort({ billDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean<IVendorBill[]>(),
      VendorBill.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  /** Unpaid/partially-paid bills whose due date has already passed — feeds the dashboard's Needs Attention list. */
  async getOverdue(schoolId: string, asOf: Date, limit = 20): Promise<IVendorBill[]> {
    return VendorBill.find({
      schoolId, isDeleted: false,
      status: { $in: ['unpaid', 'partially_paid'] },
      dueDate: { $exists: true, $lt: asOf },
    })
      .sort({ dueDate: 1 })
      .limit(limit)
      .lean<IVendorBill[]>();
  },

  /** Applies a payment to a bill's running totals — same increment-then-recompute-status pattern as FeeRecord.applyPayment. */
  async applyPayment(
    id: string,
    schoolId: string,
    paymentAmount: number,
    updatedBy: string,
    session?: ClientSession,
  ): Promise<IVendorBill | null> {
    const bill = await VendorBill.findOne({ _id: id, schoolId, isDeleted: false }).session(session ?? null);
    if (!bill) return null;

    const newPaidAmount = bill.paidAmount + paymentAmount;
    const newBalance    = Math.max(0, bill.amount - newPaidAmount);

    let newStatus: VendorBillStatus;
    if (newBalance === 0) newStatus = 'paid';
    else if (newPaidAmount > 0) newStatus = 'partially_paid';
    else newStatus = 'unpaid';

    return VendorBill.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { paidAmount: newPaidAmount, balance: newBalance, status: newStatus, updatedBy } },
      { new: true, session },
    ).lean<IVendorBill>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await VendorBill.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  async getSummary(schoolId: string, opts: { dateFrom?: string; dateTo?: string } = {}): Promise<VendorBillSummary> {
    const match: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, Date> = {};
      if (opts.dateFrom) dateRange.$gte = new Date(opts.dateFrom);
      if (opts.dateTo)   dateRange.$lte = new Date(opts.dateTo);
      match.billDate = dateRange;
    }

    const agg = await VendorBill.aggregate<{ _id: VendorBillStatus; total: number; count: number }>([
      { $match: match },
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    let totalUnpaid = 0, totalPartiallyPaid = 0, totalPaid = 0;
    let unpaidCount = 0, partiallyPaidCount = 0, paidCount = 0;
    for (const row of agg) {
      if (row._id === 'unpaid')          { totalUnpaid = row.total; unpaidCount = row.count; }
      if (row._id === 'partially_paid')  { totalPartiallyPaid = row.total; partiallyPaidCount = row.count; }
      if (row._id === 'paid')            { totalPaid = row.total; paidCount = row.count; }
    }
    return { totalUnpaid, totalPartiallyPaid, totalPaid, unpaidCount, partiallyPaidCount, paidCount };
  },
};
