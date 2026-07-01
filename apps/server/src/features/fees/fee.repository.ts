import { FeeRecord, IFeeRecord, FeeStatus, FeeHead } from './fee.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindFeesOptions {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  class?: string;
  section?: string;
  feeHead?: string;
  status?: FeeStatus;
  academicYear?: string;
  month?: string;
  dueBefore?: string;
  dueAfter?: string;
  sortBy?: 'dueDate' | 'createdAt' | 'totalAmount' | 'balance';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedFees {
  records: IFeeRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface FeeCollectionSummary {
  totalCharged: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueCount: number;
  pendingCount: number;
}

export interface CreateFeeData {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  class: string;
  section: string;
  schoolId: string;
  feeHead: FeeHead;
  customHead?: string;
  description?: string;
  academicYear: string;
  month?: string;
  dueDate: Date;
  totalAmount: number;
  discountAmount: number;
  discountReason?: string;
  waivedAmount: number;
  paidAmount: number;
  balance: number;
  status: FeeStatus;
  notes?: string;
  createdBy: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const feeRepository = {
  async create(data: CreateFeeData): Promise<IFeeRecord> {
    const record = new FeeRecord(data);
    return record.save();
  },

  async findById(id: string, schoolId: string): Promise<IFeeRecord | null> {
    return FeeRecord.findOne({ _id: id, schoolId, isDeleted: false }).lean<IFeeRecord>();
  },

  async findAll(schoolId: string, opts: FindFeesOptions = {}): Promise<PaginatedFees> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { studentName: regex },
        { admissionNumber: regex },
        { description: regex },
      ];
    }
    if (opts.studentId)    query.studentId    = opts.studentId;
    if (opts.class)        query.class        = opts.class;
    if (opts.section)      query.section      = opts.section;
    if (opts.feeHead)      query.feeHead      = opts.feeHead;
    if (opts.status)       query.status       = opts.status;
    if (opts.academicYear) query.academicYear = opts.academicYear;
    if (opts.month)        query.month        = opts.month;
    if (opts.dueBefore || opts.dueAfter) {
      const dateRange: Record<string, Date> = {};
      if (opts.dueBefore) dateRange.$lte = new Date(opts.dueBefore);
      if (opts.dueAfter)  dateRange.$gte = new Date(opts.dueAfter);
      query.dueDate = dateRange;
    }

    const sortField = opts.sortBy ?? 'dueDate';
    const sortDir   = opts.sortOrder === 'desc' ? -1 : 1;

    const [records, total] = await Promise.all([
      FeeRecord.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean<IFeeRecord[]>(),
      FeeRecord.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  /** All fee records for a student — no pagination, lightweight. */
  async findByStudent(
    schoolId: string,
    studentId: string,
    opts: { academicYear?: string; status?: FeeStatus } = {},
  ): Promise<IFeeRecord[]> {
    const query: Record<string, unknown> = { schoolId, studentId, isDeleted: false };
    if (opts.academicYear) query.academicYear = opts.academicYear;
    if (opts.status)       query.status       = opts.status;
    return FeeRecord.find(query).sort({ dueDate: 1 }).lean<IFeeRecord[]>();
  },

  /** Outstanding = pending / partially_paid / overdue. */
  async findOutstanding(
    schoolId: string,
    opts: { class?: string; section?: string; feeHead?: string; page: number; limit: number },
  ): Promise<PaginatedFees> {
    const page  = Math.max(1, opts.page);
    const limit = Math.min(100, Math.max(1, opts.limit));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = {
      schoolId,
      isDeleted: false,
      status: { $in: ['pending', 'partially_paid', 'overdue'] },
    };
    if (opts.class)   query.class   = opts.class;
    if (opts.section) query.section = opts.section;
    if (opts.feeHead) query.feeHead = opts.feeHead;

    const [records, total] = await Promise.all([
      FeeRecord.find(query).sort({ dueDate: 1 }).skip(skip).limit(limit).lean<IFeeRecord[]>(),
      FeeRecord.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<IFeeRecord> & { updatedBy?: string },
  ): Promise<IFeeRecord | null> {
    return FeeRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IFeeRecord>();
  },

  /** Atomic: increment paidAmount and recompute balance + status. */
  async applyPayment(
    id: string,
    schoolId: string,
    paymentAmount: number,
    updatedBy: string,
  ): Promise<IFeeRecord | null> {
    const record = await FeeRecord.findOne({ _id: id, schoolId, isDeleted: false });
    if (!record) return null;

    const newPaidAmount = record.paidAmount + paymentAmount;
    const newBalance    = Math.max(0, record.totalAmount - record.discountAmount - record.waivedAmount - newPaidAmount);

    let newStatus: FeeStatus;
    if (newBalance === 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = record.status === 'overdue' ? 'overdue' : 'pending';
    }

    return FeeRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { paidAmount: newPaidAmount, balance: newBalance, status: newStatus, updatedBy } },
      { new: true },
    ).lean<IFeeRecord>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await FeeRecord.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Aggregate summary stats for the dashboard. */
  async getSummary(schoolId: string, opts: { academicYear?: string } = {}): Promise<FeeCollectionSummary> {
    const match: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.academicYear) match.academicYear = opts.academicYear;

    const agg = await FeeRecord.aggregate<{
      _id: FeeStatus;
      totalCharged: number;
      totalPaid: number;
      count: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: '$status',
          totalCharged: { $sum: '$totalAmount' },
          totalPaid:    { $sum: '$paidAmount' },
          count:        { $sum: 1 },
        },
      },
    ]);

    let totalCharged    = 0;
    let totalCollected  = 0;
    let overdueCount    = 0;
    let pendingCount    = 0;

    for (const row of agg) {
      totalCharged   += row.totalCharged;
      totalCollected += row.totalPaid;
      if (row._id === 'overdue')   overdueCount += row.count;
      if (row._id === 'pending' || row._id === 'partially_paid') pendingCount += row.count;
    }

    return {
      totalCharged,
      totalCollected,
      totalOutstanding: totalCharged - totalCollected,
      overdueCount,
      pendingCount,
    };
  },
};
