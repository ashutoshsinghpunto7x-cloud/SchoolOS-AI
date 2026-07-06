import { Student, IStudent, AdmissionStatus } from './student.model';
import { CreateStudentInput, UpdateStudentInput } from './student.validation';

// ── Types ─────────────────────────────────────────────────────────────────────

type CreatePayload = CreateStudentInput & {
  admissionNumber: string;
  admissionYear: number;
  schoolId: string;
  createdBy?: string;
};

export interface FindStudentsOptions {
  page?: number;
  limit?: number;
  search?: string;
  class?: string;
  section?: string;
  status?: AdmissionStatus;
  gender?: string;
  admissionYear?: number;
  tags?: string;
}

export interface PaginatedStudents {
  students: IStudent[];
  total: number;
  page: number;
  limit: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const studentRepository = {
  async create(data: CreatePayload): Promise<IStudent> {
    const student = new Student(data);
    return student.save();
  },

  async findAll(schoolId: string, opts: FindStudentsOptions = {}): Promise<PaginatedStudents> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      // Regex search across key fields (text index used for full-text in future)
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { fullName: regex },
        { admissionNumber: regex },
        { rollNumber: regex },
        { fatherName: regex },
        { motherName: regex },
        { parentPhone: regex },
      ];
    }
    if (opts.class) query.class = opts.class;
    if (opts.section) query.section = opts.section;
    if (opts.status) query.admissionStatus = opts.status;
    if (opts.gender) query.gender = opts.gender;
    if (opts.admissionYear) query.admissionYear = opts.admissionYear;
    if (opts.tags) query.tags = { $in: [opts.tags] };

    const [students, total] = await Promise.all([
      Student.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IStudent[]>(),
      Student.countDocuments(query),
    ]);

    return { students, total, page, limit };
  },

  /** Lightweight list for autocomplete/search — returns first 50, no pagination. */
  async findForSearch(schoolId: string, search?: string): Promise<IStudent[]> {
    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (search?.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ fullName: regex }, { admissionNumber: regex }, { rollNumber: regex }, { parentPhone: regex }];
    }
    return Student.find(query).sort({ fullName: 1 }).limit(50).lean<IStudent[]>();
  },

  async findById(id: string, schoolId: string): Promise<IStudent | null> {
    return Student.findOne({ _id: id, schoolId, isDeleted: false }).lean<IStudent>();
  },

  async update(id: string, schoolId: string, data: UpdateStudentInput & { updatedBy?: string }): Promise<IStudent | null> {
    return Student.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IStudent>();
  },

  async changeStatus(
    id: string,
    schoolId: string,
    status: AdmissionStatus,
    updatedBy?: string
  ): Promise<IStudent | null> {
    return Student.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { admissionStatus: status, updatedBy } },
      { new: true }
    ).lean<IStudent>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Student.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } }
    );
    return result.modifiedCount > 0;
  },

  async countAll(schoolId: string): Promise<number> {
    return Student.countDocuments({ schoolId, isDeleted: false });
  },

  /** Includes soft-deleted rows so a freed-up admission number is never reissued. */
  async countByAdmissionYear(schoolId: string, admissionYear: number): Promise<number> {
    return Student.countDocuments({ schoolId, admissionYear });
  },
};
