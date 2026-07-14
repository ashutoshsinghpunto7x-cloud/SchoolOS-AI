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
  fineAmount: number;
  fineReason?: string;
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

  /** All fee records for a class+section, across every fee head — no pagination, used
   * to compute each student's overall balance for the class-wise Fee Records view. */
  async findByClassSection(schoolId: string, klass: string, section: string): Promise<IFeeRecord[]> {
    return FeeRecord.find({ schoolId, class: klass, section, isDeleted: false }).lean<IFeeRecord[]>();
  },

  /** Collected vs. pending totals for every class+section that has at least one fee
   * record — used for Principal/Admin's class-wise fee overview. One aggregate query
   * instead of one query per class+section. */
  async getClassSectionTotals(schoolId: string): Promise<{ class: string; section: string; collected: number; pending: number }[]> {
    const rows = await FeeRecord.aggregate<{ _id: { class: string; section: string }; collected: number; pending: number }>([
      { $match: { schoolId, isDeleted: false } },
      { $group: { _id: { class: '$class', section: '$section' }, collected: { $sum: '$paidAmount' }, pending: { $sum: '$balance' } } },
    ]);
    return rows.map((r) => ({ class: r._id.class, section: r._id.section, collected: r.collected, pending: r.pending }));
  },

  /** All non-deleted fee records for a class + fee head (+ academic year, + optional
   * month) — used to propagate a fee structure amount change onto every
   * not-yet-settled record. A null month matches only records without a month. */
  async findByClassFeeHead(
    schoolId: string,
    klass: string,
    feeHead: FeeHead,
    academicYear: string,
    month?: string | null,
  ): Promise<IFeeRecord[]> {
    const query: Record<string, unknown> = { schoolId, class: klass, feeHead, academicYear, isDeleted: false };
    if (month) query.month = month;
    else query.month = { $in: [null, undefined] };
    return FeeRecord.find(query).lean<IFeeRecord[]>();
  },

  /** Used by the import engine's duplicate check — a null/absent month matches
   *  only records without a month (e.g. a one-time admission fee). */
  async findDuplicate(
    schoolId: string,
    studentId: string,
    feeHead: FeeHead,
    academicYear: string,
    month?: string,
  ): Promise<IFeeRecord | null> {
    const query: Record<string, unknown> = { schoolId, studentId, feeHead, academicYear, isDeleted: false };
    if (month) query.month = month;
    else query.month = { $in: [null, undefined, ''] };
    return FeeRecord.findOne(query).lean<IFeeRecord>();
  },

  /** Find a specific month's fee record for a student (used to avoid duplicate months on recurring/bulk generation). */
  async findByStudentAndMonth(
    schoolId: string,
    studentId: string,
    feeHead: FeeHead,
    month: string,
    academicYear: string,
  ): Promise<IFeeRecord | null> {
    return FeeRecord.findOne({ schoolId, studentId, feeHead, month, academicYear, isDeleted: false }).lean<IFeeRecord>();
  },

  /** Flip pending/partially_paid records past their due date to 'overdue'. Runs across all schools. */
  async markOverdue(asOf: Date): Promise<number> {
    const result = await FeeRecord.updateMany(
      { isDeleted: false, status: { $in: ['pending', 'partially_paid'] }, dueDate: { $lt: asOf } },
      { $set: { status: 'overdue' } },
    );
    return result.modifiedCount;
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
    const newBalance    = Math.max(0, record.totalAmount + record.fineAmount - record.discountAmount - record.waivedAmount - newPaidAmount);

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
