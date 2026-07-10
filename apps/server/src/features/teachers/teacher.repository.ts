import { Teacher, ITeacher, EmploymentStatus } from './teacher.model';
import { UpdateTeacherInput } from './teacher.validation';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindTeachersOptions {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: EmploymentStatus;
  subject?: string;
  class?: string;
  sortBy?: 'fullName' | 'createdAt' | 'joiningDate';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedTeachers {
  teachers: ITeacher[];
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
  emergencyContact?: { name: string; phone: string; relation: string };
  department?: string;
  subjects: string[];
  assignedClasses: string[];
  qualification?: { degree: string; institution: string; yearOfPassing?: number };
  experienceYears?: number;
  joiningDate?: string;
  employmentStatus: EmploymentStatus;
  tags: string[];
  remarks?: string;
  customFields?: Record<string, unknown>;
  schoolId: string;
  createdBy?: string;
};

// ── Repository ────────────────────────────────────────────────────────────────

export const teacherRepository = {
  async create(data: CreatePayload): Promise<ITeacher> {
    const teacher = new Teacher(data);
    return teacher.save();
  },

  async findAll(schoolId: string, opts: FindTeachersOptions = {}): Promise<PaginatedTeachers> {
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
        { subjects: regex },
      ];
    }
    if (opts.department) query.department = new RegExp(opts.department, 'i');
    if (opts.status)     query.employmentStatus = opts.status;
    if (opts.subject)    query.subjects = { $in: [new RegExp(opts.subject, 'i')] };
    if (opts.class)      query.assignedClasses = { $in: [new RegExp(opts.class, 'i')] };

    const sortField = opts.sortBy ?? 'createdAt';
    const sortDir   = opts.sortOrder === 'asc' ? 1 : -1;

    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean<ITeacher[]>(),
      Teacher.countDocuments(query),
    ]);

    return { teachers, total, page, limit };
  },

  /** Lightweight — returns first 50 results for autocomplete. */
  async findForSearch(schoolId: string, search?: string): Promise<ITeacher[]> {
    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (search?.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ fullName: regex }, { employeeId: regex }, { phone: regex }];
    }
    return Teacher.find(query).sort({ fullName: 1 }).limit(50).lean<ITeacher[]>();
  },

  async findById(id: string, schoolId: string): Promise<ITeacher | null> {
    return Teacher.findOne({ _id: id, schoolId, isDeleted: false }).lean<ITeacher>();
  },

  /** Used by the Excel import pipeline to detect duplicates — email first (more
   * reliable), falling back to phone — so re-uploading a file updates existing
   * teachers instead of creating duplicates. employeeId can't be used here since
   * it's server-generated, never supplied by the source file. */
  async findByEmailOrPhone(schoolId: string, email: string | undefined, phone: string | undefined): Promise<ITeacher | null> {
    if (!email && !phone) return null;
    const or: Record<string, unknown>[] = [];
    if (email) or.push({ email });
    if (phone) or.push({ phone });
    return Teacher.findOne({ schoolId, isDeleted: false, $or: or }).lean<ITeacher>();
  },

  async update(
    id: string,
    schoolId: string,
    data: UpdateTeacherInput & { updatedBy?: string },
  ): Promise<ITeacher | null> {
    return Teacher.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    ).lean<ITeacher>();
  },

  async updatePhoto(id: string, schoolId: string, photoUrl: string | undefined, updatedBy: string): Promise<ITeacher | null> {
    const update = photoUrl
      ? { $set: { photoUrl, updatedBy } }
      : { $unset: { photoUrl: '' }, $set: { updatedBy } };
    return Teacher.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      update,
      { new: true },
    ).lean<ITeacher>();
  },

  async changeStatus(
    id: string,
    schoolId: string,
    status: EmploymentStatus,
    updatedBy?: string,
  ): Promise<ITeacher | null> {
    return Teacher.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { employmentStatus: status, updatedBy } },
      { new: true }
    ).lean<ITeacher>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Teacher.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } }
    );
    return result.modifiedCount > 0;
  },

  async countAll(schoolId: string): Promise<number> {
    return Teacher.countDocuments({ schoolId, isDeleted: false });
  },

  async employeeIdExists(employeeId: string, schoolId: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { employeeId, schoolId, isDeleted: false };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await Teacher.countDocuments(query);
    return count > 0;
  },
};
