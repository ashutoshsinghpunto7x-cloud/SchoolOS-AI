import { ExpenseRecord, IExpenseRecord, ExpenseCategory, ExpenseStatus } from './expense.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindExpensesOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedExpenses {
  records: IExpenseRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ExpenseSummary {
  totalPending: number;
  totalApproved: number;
  pendingCount: number;
  approvedCount: number;
}

export interface CreateExpenseData {
  schoolId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  notes?: string;
  createdBy: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const expenseRepository = {
  async create(data: CreateExpenseData): Promise<IExpenseRecord> {
    const record = new ExpenseRecord(data);
    return record.save();
  },

  async findById(id: string, schoolId: string): Promise<IExpenseRecord | null> {
    return ExpenseRecord.findOne({ _id: id, schoolId, isDeleted: false }).lean<IExpenseRecord>();
  },

  async findAll(schoolId: string, opts: FindExpensesOptions = {}): Promise<PaginatedExpenses> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.title = regex;
    }
    if (opts.category) query.category = opts.category;
    if (opts.status)   query.status   = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, Date> = {};
      if (opts.dateFrom) dateRange.$gte = new Date(opts.dateFrom);
      if (opts.dateTo)   dateRange.$lte = new Date(opts.dateTo);
      query.date = dateRange;
    }

    const [records, total] = await Promise.all([
      ExpenseRecord.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean<IExpenseRecord[]>(),
      ExpenseRecord.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<IExpenseRecord> & { updatedBy?: string },
  ): Promise<IExpenseRecord | null> {
    return ExpenseRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IExpenseRecord>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await ExpenseRecord.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  async getSummary(schoolId: string, opts: { dateFrom?: string; dateTo?: string } = {}): Promise<ExpenseSummary> {
    const match: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.dateFrom || opts.dateTo) {
      const dateRange: Record<string, Date> = {};
      if (opts.dateFrom) dateRange.$gte = new Date(opts.dateFrom);
      if (opts.dateTo)   dateRange.$lte = new Date(opts.dateTo);
      match.date = dateRange;
    }

    const agg = await ExpenseRecord.aggregate<{ _id: ExpenseStatus; total: number; count: number }>([
      { $match: match },
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    let totalPending = 0, totalApproved = 0, pendingCount = 0, approvedCount = 0;
    for (const row of agg) {
      if (row._id === 'pending')  { totalPending  = row.total; pendingCount  = row.count; }
      if (row._id === 'approved') { totalApproved = row.total; approvedCount = row.count; }
    }
    return { totalPending, totalApproved, pendingCount, approvedCount };
  },
};
