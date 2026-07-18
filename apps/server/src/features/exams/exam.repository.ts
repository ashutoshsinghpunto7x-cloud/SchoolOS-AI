import { Exam, IExam, ExamType, ExamStatus, IExamComponent, IGradeBand } from './exam.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateExamData {
  schoolId: string;
  name: string;
  examType: ExamType;
  termLabel?: string;
  classesApplicable: string[];
  subjects: string[];
  components: IExamComponent[];
  gradingBands: IGradeBand[];
  passPercent: number;
  subjectWiseMinPercent?: number;
  createdBy?: string;
}

export type UpdateExamData = Partial<Omit<CreateExamData, 'schoolId' | 'createdBy'>> & { updatedBy?: string };

export interface FindExamOptions {
  page?: number;
  limit?: number;
  class?: string;
  examType?: ExamType;
  status?: ExamStatus;
  search?: string;
}

export interface PaginatedExams {
  exams: IExam[];
  total: number;
  page: number;
  limit: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const examRepository = {
  async create(data: CreateExamData): Promise<IExam> {
    const exam = new Exam(data);
    return exam.save();
  },

  async findById(id: string, schoolId: string): Promise<IExam | null> {
    return Exam.findOne({ _id: id, schoolId, isDeleted: false }).lean<IExam>();
  },

  async update(id: string, schoolId: string, data: UpdateExamData): Promise<IExam | null> {
    return Exam.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IExam>();
  },

  async updateStatus(id: string, schoolId: string, status: ExamStatus, updatedBy?: string): Promise<IExam | null> {
    return Exam.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { status, updatedBy } },
      { new: true, runValidators: true }
    ).lean<IExam>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Exam.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } }
    );
    return result.modifiedCount > 0;
  },

  async findAll(schoolId: string, opts: FindExamOptions): Promise<PaginatedExams> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.class)    query.classesApplicable = opts.class;
    if (opts.examType) query.examType = opts.examType;
    if (opts.status)   query.status = opts.status;
    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { termLabel: regex }];
    }

    const [exams, total] = await Promise.all([
      Exam.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IExam[]>(),
      Exam.countDocuments(query),
    ]);

    return { exams, total, page, limit };
  },

  /** Exams applicable to a specific class — used to populate the teacher's exam filter. */
  async findForClass(schoolId: string, cls: string): Promise<IExam[]> {
    return Exam.find({ schoolId, classesApplicable: cls, isDeleted: false, status: { $ne: 'draft' } })
      .sort({ createdAt: -1 })
      .lean<IExam[]>();
  },
};
