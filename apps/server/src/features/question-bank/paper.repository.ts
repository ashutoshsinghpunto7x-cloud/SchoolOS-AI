import { PaperGenerationConfig, PaperValidationResult } from '@schoolos/types';
import { GeneratedPaperModel, IGeneratedPaper } from './paper.model';

export interface CreatePaperData {
  schoolId: string;
  config: PaperGenerationConfig;
  questionIds: string[];
  sectionSizes?: number[];
  totalMarksAssembled: number;
  validation: PaperValidationResult;
  createdBy: string;
}

export interface PaperListOptions {
  class?: string;
  subject?: string;
  page?: number;
  limit?: number;
  // Only used when `class`/`subject` are both omitted — narrows an unscoped "browse everything"
  // query to a specific set of {class, subject} pairs (see question-bank.service.ts's
  // getTeacherAllowedClassSubjects).
  classSubjectPairs?: { class: string; subject: string }[];
}

export interface PaginatedPapers {
  papers: IGeneratedPaper[];
  total: number;
  page: number;
  limit: number;
}

export const paperRepository = {
  async create(data: CreatePaperData): Promise<IGeneratedPaper> {
    return GeneratedPaperModel.create(data);
  },

  async findById(id: string, schoolId: string): Promise<IGeneratedPaper | null> {
    return GeneratedPaperModel.findOne({ _id: id, schoolId, isDeleted: { $ne: true } }).lean<IGeneratedPaper>();
  },

  /**
   * Lists papers for a class/subject regardless of who generated them, so a teacher reassigned
   * onto that class/subject can still find a predecessor's papers. `class`/`subject` aren't
   * top-level fields on this model (they live inside the `config` Mixed blob) — queried here by
   * dot-path instead of adding a schema/migration for it.
   */
  async findAll(schoolId: string, opts: PaperListOptions = {}): Promise<PaginatedPapers> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: { $ne: true } };
    if (opts.class) query['config.class'] = opts.class;
    if (opts.subject) query['config.subject'] = opts.subject;
    if (!opts.class && !opts.subject && opts.classSubjectPairs && opts.classSubjectPairs.length > 0) {
      query.$or = opts.classSubjectPairs.map((p) => ({ 'config.class': p.class, 'config.subject': p.subject }));
    }

    const [papers, total] = await Promise.all([
      GeneratedPaperModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IGeneratedPaper[]>(),
      GeneratedPaperModel.countDocuments(query),
    ]);

    return { papers, total, page, limit };
  },

  /** Every generated paper in the school, across every class/subject — backs the principal's
   *  materials-by-class overview (paper list per chapter, contributing teacher). */
  async findAllForSchool(schoolId: string): Promise<IGeneratedPaper[]> {
    return GeneratedPaperModel.find({ schoolId, isDeleted: { $ne: true } }).lean<IGeneratedPaper[]>();
  },

  async softDelete(id: string, schoolId: string): Promise<boolean> {
    const res = await GeneratedPaperModel.updateOne(
      { _id: id, schoolId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return res.modifiedCount > 0;
  },
};
