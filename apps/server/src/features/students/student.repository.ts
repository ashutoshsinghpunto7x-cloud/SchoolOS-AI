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

  /** Used by the Excel import pipeline to upsert — re-uploading a file updates existing students instead of duplicating them. */
  /** Every active student in a class, across all sections — used to generate
   *  fee records for a class-wide fee structure entry. Lean projection since
   *  callers only need identity fields, not the full document. */
  async findActiveByClass(schoolId: string, klass: string): Promise<Pick<IStudent, '_id' | 'fullName' | 'admissionNumber' | 'class' | 'section'>[]> {
    return Student.find({ schoolId, class: klass, isDeleted: false })
      .select('_id fullName admissionNumber class section')
      .lean<Pick<IStudent, '_id' | 'fullName' | 'admissionNumber' | 'class' | 'section'>[]>();
  },

  async findByAdmissionNumber(admissionNumber: string, schoolId: string): Promise<IStudent | null> {
    return Student.findOne({ admissionNumber, schoolId, isDeleted: false }).lean<IStudent>();
  },

  /** Only ever set from an approved FeeDiscountRequest — never a general profile edit. */
  async updateApprovedDiscount(id: string, schoolId: string, amount: number, reason: string): Promise<IStudent | null> {
    return Student.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { approvedDiscountAmount: amount, approvedDiscountReason: reason } },
      { new: true },
    ).lean<IStudent>();
  },

  async update(id: string, schoolId: string, data: UpdateStudentInput & { updatedBy?: string }): Promise<IStudent | null> {
    return Student.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IStudent>();
  },

  /** Bulk-renames every student currently under `oldName` to `newName` — used when a
   * class in the SchoolClass catalog is renamed, since Student.class is a free-text
   * field with no foreign key back to the catalog. Returns how many rows changed. */
  async renameClass(schoolId: string, oldName: string, newName: string): Promise<number> {
    const result = await Student.updateMany(
      { schoolId, class: oldName, isDeleted: false },
      { $set: { class: newName } },
    );
    return result.modifiedCount;
  },

  async updatePhoto(id: string, schoolId: string, photoUrl: string | undefined, updatedBy: string): Promise<IStudent | null> {
    const update = photoUrl
      ? { $set: { photoUrl, updatedBy } }
      : { $unset: { photoUrl: '' }, $set: { updatedBy } };
    return Student.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      update,
      { new: true },
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

  /** Active student count per class+section — used for Principal/Admin's class-wise overview. */
  async getClassSectionCounts(schoolId: string): Promise<{ class: string; section: string; count: number }[]> {
    const rows = await Student.aggregate<{ _id: { class: string; section: string }; count: number }>([
      { $match: { schoolId, isDeleted: false, admissionStatus: { $in: ['active', 'enrolled'] } } },
      { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
    ]);
    return rows.map((r) => ({ class: r._id.class, section: r._id.section, count: r.count }));
  },

  /**
   * Highest sequence number currently in use for the `ADM-{year}-NNNN` series.
   * Counting students is unreliable for generating the next number — soft-deleted
   * rows, gaps, and imports that carry their own admission numbers all leave the
   * count out of step with the actual max, causing duplicate-key collisions.
   * Basing the next number on the real max guarantees max+1 is always free.
   * Scans soft-deleted rows too, since the unique index covers them.
   */
  async maxAdmissionSequence(schoolId: string, year: number): Promise<number> {
    const prefix = `ADM-${year}-`;
    const doc = await Student.findOne(
      { schoolId, admissionNumber: { $regex: `^${prefix}\\d+$` } },
      { admissionNumber: 1 },
    )
      .sort({ admissionNumber: -1 }) // zero-padded, so lexical sort == numeric sort
      .lean<{ admissionNumber: string }>();
    if (!doc) return 0;
    const seq = parseInt(doc.admissionNumber.slice(prefix.length), 10);
    return Number.isNaN(seq) ? 0 : seq;
  },
};
