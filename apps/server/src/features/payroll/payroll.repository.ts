import { PayrollRecord, IPayrollRecord, PayrollStatus } from './payroll.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindPayrollOptions {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
  department?: string;
  status?: PayrollStatus;
}

export interface PaginatedPayroll {
  records: IPayrollRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface PayrollSummary {
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  draftCount: number;
  generatedCount: number;
  paidCount: number;
}

export interface CreatePayrollData {
  employeeObjectId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department?: string;
  schoolId: string;
  month: number;
  year: number;
  workingDaysPerMonth: number;
  dailyRate: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  generatedAt: Date;
  createdBy: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const payrollRepository = {
  async create(data: CreatePayrollData): Promise<IPayrollRecord> {
    const record = new PayrollRecord(data);
    return record.save();
  },

  async findById(id: string, schoolId: string): Promise<IPayrollRecord | null> {
    return PayrollRecord.findOne({ _id: id, schoolId, isDeleted: false }).lean<IPayrollRecord>();
  },

  async findByEmployeeMonthYear(
    schoolId: string,
    employeeObjectId: string,
    month: number,
    year: number,
  ): Promise<IPayrollRecord | null> {
    return PayrollRecord.findOne({ schoolId, employeeObjectId, month, year, isDeleted: false });
  },

  /** Self-service: every payroll record for one employee, newest first —
   *  used to let a teacher view their own payslip history. */
  async findAllForEmployee(schoolId: string, employeeObjectId: string): Promise<IPayrollRecord[]> {
    return PayrollRecord.find({ schoolId, employeeObjectId, isDeleted: false })
      .sort({ year: -1, month: -1 })
      .lean<IPayrollRecord[]>();
  },

  async findAll(schoolId: string, opts: FindPayrollOptions = {}): Promise<PaginatedPayroll> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.month)      query.month = opts.month;
    if (opts.year)       query.year = opts.year;
    if (opts.department) query.department = new RegExp(opts.department, 'i');
    if (opts.status)     query.status = opts.status;

    const [records, total] = await Promise.all([
      PayrollRecord.find(query).sort({ year: -1, month: -1, employeeName: 1 }).skip(skip).limit(limit).lean<IPayrollRecord[]>(),
      PayrollRecord.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<IPayrollRecord> & { updatedBy?: string },
  ): Promise<IPayrollRecord | null> {
    return PayrollRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IPayrollRecord>();
  },

  async markPaid(
    id: string,
    schoolId: string,
    paidAt: Date,
    paymentMode: import('../fees/fee.model').PaymentMode | undefined,
    paidBy: string,
    notes?: string,
  ): Promise<IPayrollRecord | null> {
    return PayrollRecord.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { status: 'paid', paidAt, paymentMode, paidBy, notes, updatedBy: paidBy } },
      { new: true },
    ).lean<IPayrollRecord>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await PayrollRecord.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  async getSummary(schoolId: string, opts: { month?: number; year?: number } = {}): Promise<PayrollSummary> {
    const match: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.month) match.month = opts.month;
    if (opts.year)  match.year  = opts.year;

    const agg = await PayrollRecord.aggregate<{
      _id: PayrollStatus;
      gross: number;
      deductions: number;
      net: number;
      count: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: '$status',
          gross: { $sum: '$grossSalary' },
          deductions: { $sum: '$deductions' },
          net: { $sum: '$netSalary' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalGross = 0, totalDeductions = 0, totalNet = 0;
    let draftCount = 0, generatedCount = 0, paidCount = 0;
    for (const row of agg) {
      totalGross += row.gross;
      totalDeductions += row.deductions;
      totalNet += row.net;
      if (row._id === 'draft')     draftCount = row.count;
      if (row._id === 'generated') generatedCount = row.count;
      if (row._id === 'paid')      paidCount = row.count;
    }
    return { totalGross, totalDeductions, totalNet, draftCount, generatedCount, paidCount };
  },
};
