import { Employee, IEmployee, EmployeeRole, EmployeeStatus, IEmployeeQr } from './employee.model';
import { UpdateEmployeeInput } from './employee.validation';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindEmployeesOptions {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  sortBy?: 'fullName' | 'createdAt' | 'joiningDate';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedEmployees {
  employees: IEmployee[];
  total: number;
  page: number;
  limit: number;
}

type CreatePayload = {
  fullName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  employeeId: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  designation: string;
  department?: string;
  joiningDate?: string;
  monthlySalary?: number;
  employmentType?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  teacherId?: string;
  schoolId: string;
  createdBy?: string;
};

// ── Repository ────────────────────────────────────────────────────────────────

export const employeeRepository = {
  async create(data: CreatePayload): Promise<IEmployee> {
    const employee = new Employee(data);
    return employee.save();
  },

  async findAll(schoolId: string, opts: FindEmployeesOptions = {}): Promise<PaginatedEmployees> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { fullName: regex },
        { employeeId: regex },
        { email: regex },
        { phone: regex },
        { department: regex },
        { designation: regex },
      ];
    }
    if (opts.department) query.department = new RegExp(opts.department, 'i');
    if (opts.role)       query.role = opts.role;
    if (opts.status)     query.status = opts.status;

    const sortField = opts.sortBy ?? 'createdAt';
    const sortDir   = opts.sortOrder === 'asc' ? 1 : -1;

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean<IEmployee[]>(),
      Employee.countDocuments(query),
    ]);

    return { employees, total, page, limit };
  },

  async findById(id: string, schoolId: string): Promise<IEmployee | null> {
    return Employee.findOne({ _id: id, schoolId, isDeleted: false }).lean<IEmployee>();
  },

  async findByEmployeeId(employeeId: string, schoolId: string): Promise<IEmployee | null> {
    return Employee.findOne({ employeeId, schoolId, isDeleted: false }).lean<IEmployee>();
  },

  async findByUserId(userId: string, schoolId: string): Promise<IEmployee | null> {
    return Employee.findOne({ userId, schoolId, isDeleted: false }).lean<IEmployee>();
  },

  /** Which of these employeeId strings have a live (non-deleted) Employee doc —
   *  used to flag teachers whose HR mirror is missing before they hit a
   *  "Employee not found" error at attendance-mark time. */
  async findExistingEmployeeIds(employeeIds: string[], schoolId: string): Promise<Set<string>> {
    if (!employeeIds.length) return new Set();
    const docs = await Employee.find(
      { employeeId: { $in: employeeIds }, schoolId, isDeleted: false },
      { employeeId: 1 }
    ).lean<{ employeeId: string }[]>();
    return new Set(docs.map((d) => d.employeeId));
  },

  /** Full (non-lean) document — needed when the service must call .save() directly,
   *  e.g. mutating the qr sub-document. */
  async findDocById(id: string, schoolId: string): Promise<IEmployee | null> {
    return Employee.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async update(
    id: string,
    schoolId: string,
    data: UpdateEmployeeInput & { updatedBy?: string },
  ): Promise<IEmployee | null> {
    return Employee.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IEmployee>();
  },

  async updatePhoto(id: string, schoolId: string, photoUrl: string | undefined, updatedBy: string): Promise<IEmployee | null> {
    const update = photoUrl
      ? { $set: { photoUrl, updatedBy } }
      : { $unset: { photoUrl: '' }, $set: { updatedBy } };
    return Employee.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      update,
      { new: true },
    ).lean<IEmployee>();
  },

  async updateSignature(id: string, schoolId: string, signatureUrl: string | undefined, updatedBy: string): Promise<IEmployee | null> {
    const update = signatureUrl
      ? { $set: { signatureUrl, updatedBy } }
      : { $unset: { signatureUrl: '' }, $set: { updatedBy } };
    return Employee.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      update,
      { new: true },
    ).lean<IEmployee>();
  },

  async setUserId(id: string, schoolId: string, userId: string): Promise<IEmployee | null> {
    return Employee.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { userId } },
      { new: true }
    ).lean<IEmployee>();
  },

  async setQr(id: string, schoolId: string, qr: IEmployeeQr): Promise<IEmployee | null> {
    return Employee.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { qr } },
      { new: true }
    ).lean<IEmployee>();
  },

  async setQrStatus(id: string, schoolId: string, status: IEmployeeQr['status']): Promise<IEmployee | null> {
    return Employee.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { 'qr.status': status } },
      { new: true }
    ).lean<IEmployee>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Employee.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } }
    );
    return result.modifiedCount > 0;
  },

  async countAll(schoolId: string): Promise<number> {
    return Employee.countDocuments({ schoolId, isDeleted: false });
  },
};
