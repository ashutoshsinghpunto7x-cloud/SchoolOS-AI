import { SalaryRecord, ISalaryRecord, SalaryStatus } from './salary.model';
import type { PaymentMode } from '../fees/fee.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindSalaryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: SalaryStatus;
  month?: string;
  year?: number;
}

export interface PaginatedSalary {
  records: ISalaryRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface SalarySummary {
  totalScheduled: number;
  totalPending: number;
  totalPaid: number;
  scheduledCount: number;
  pendingCount: number;
  paidCount: number;
}

export interface CreateSalaryData {
  schoolId: string;
  employeeName: string;
  designation: string;
  teacherId?: string;
  month: string;
  year: number;
  amount: number;
  dueDate: Date;
  status: SalaryStatus;
  notes?: string;
  createdBy: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const salaryRepository = {
  async create(data: CreateSalaryData): Promise<ISalaryRecord> {
    const record = new SalaryRecord(data);
    return record.save();
  },

  async findById(id: string, schoolId: string): Promise<ISalaryRecord | null> {
    return SalaryRecord.findOne({ _id: id, schoolId, isDeleted: false }).lean<ISalaryRecord>();
  },

  async findAll(schoolId: string, opts: FindSalaryOptions = {}): Promise<PaginatedSalary> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ employeeName: regex }, { designation: regex }];
    }
    if (opts.status) query.status = opts.status;
    if (opts.month)  query.month  = opts.month;
    if (opts.year)   query.year   = opts.year;

    const [records, total] = await Promise.all([
      SalaryRecord.find(query).sort({ year: -1, createdAt: -1 }).skip(skip).limit(limit).lean<ISalaryRecord[]>(),
      SalaryRecord.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<ISalaryRecord> & { updatedBy?: string },
  ): Promise<ISalaryRecord | null> {
    return SalaryRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<ISalaryRecord>();
  },

  async markPaid(
    id: string,
    schoolId: string,
    paidDate: Date,
    paymentMode: PaymentMode,
    updatedBy: string,
    notes?: string,
  ): Promise<ISalaryRecord | null> {
    return SalaryRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { status: 'paid', paidDate, paymentMode, notes, updatedBy } },
      { new: true },
    ).lean<ISalaryRecord>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await SalaryRecord.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Flips 'scheduled' salaries past their due date to 'pending'. Called opportunistically like the fee overdue sweep. */
  async markDue(asOf: Date): Promise<number> {
    const result = await SalaryRecord.updateMany(
      { isDeleted: false, status: 'scheduled', dueDate: { $lte: asOf } },
      { $set: { status: 'pending' } },
    );
    return result.modifiedCount;
  },

  /** Accountant override — force a still-scheduled salary into 'pending' ahead of its due date. */
  async forcePending(id: string, schoolId: string, updatedBy: string): Promise<ISalaryRecord | null> {
    return SalaryRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false, status: 'scheduled' },
      { $set: { status: 'pending', updatedBy } },
      { new: true },
    ).lean<ISalaryRecord>();
  },

  async getSummary(schoolId: string, opts: { month?: string; year?: number } = {}): Promise<SalarySummary> {
    const match: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.month) match.month = opts.month;
    if (opts.year)  match.year  = opts.year;

    const agg = await SalaryRecord.aggregate<{ _id: SalaryStatus; total: number; count: number }>([
      { $match: match },
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    let totalScheduled = 0, totalPending = 0, totalPaid = 0, scheduledCount = 0, pendingCount = 0, paidCount = 0;
    for (const row of agg) {
      if (row._id === 'scheduled') { totalScheduled = row.total; scheduledCount = row.count; }
      if (row._id === 'pending')   { totalPending   = row.total; pendingCount   = row.count; }
      if (row._id === 'paid')      { totalPaid      = row.total; paidCount      = row.count; }
    }
    return { totalScheduled, totalPending, totalPaid, scheduledCount, pendingCount, paidCount };
  },
};
