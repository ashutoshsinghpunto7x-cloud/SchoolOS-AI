import { Marks, IMarks, IComponentScore, MarksWorkflowStatus, IMarksAuditEntry, ResultStatus } from './marks.model';
import { ValidationError } from '../../middlewares/errorHandler';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UpsertMarksData {
  schoolId: string;
  examId: string;
  studentId: string;
  class: string;
  section: string;
  subjectName: string;
  componentScores: IComponentScore[];
  total?: number;
  percentage?: number;
  grade?: string;
  result: ResultStatus;
  remark?: string;
  enteredById: string;
  enteredByName: string;
  auditEntry: IMarksAuditEntry;
}

export interface BatchTarget {
  schoolId: string;
  examId: string;
  class: string;
  section: string;
  subjectName: string;
}

export interface FindMarksOptions {
  page?: number;
  limit?: number;
  examId?: string;
  class?: string;
  section?: string;
  subjectName?: string;
  studentId?: string;
  workflowStatus?: MarksWorkflowStatus;
}

export interface PaginatedMarks {
  records: IMarks[];
  total: number;
  page: number;
  limit: number;
}

export interface MarksSummary {
  totalStudents: number;
  completed: number;
  pending: number;
  draft: number;
  submitted: number;
  needsCorrection: number;
  approved: number;
  published: number;
  locked: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const marksRepository = {
  /**
   * Upsert on (schoolId, examId, studentId, subjectName) — the same idempotent
   * pattern as attendanceRepository.upsert, so re-saving a draft never creates
   * a duplicate record for the same student+subject+exam.
   */
  async upsert(data: UpsertMarksData): Promise<IMarks> {
    const existing = await Marks.findOne({
      schoolId: data.schoolId, examId: data.examId, studentId: data.studentId,
      subjectName: data.subjectName, isDeleted: false,
    });

    if (existing) {
      if (existing.workflowStatus === 'locked') {
        throw new ValidationError('These marks are locked — ask an admin to reopen them before editing');
      }
      existing.componentScores = data.componentScores;
      existing.total = data.total;
      existing.percentage = data.percentage;
      existing.grade = data.grade;
      existing.result = data.result;
      existing.remark = data.remark;
      existing.lastEditedById = data.enteredById;
      existing.lastEditedByName = data.enteredByName;
      existing.lastEditedAt = new Date();
      // Any edit after correction/approval/submission pulls the record back to
      // draft so it goes through review again rather than silently publishing
      // a value nobody re-checked. A fresh draft edit stays a draft.
      if (existing.workflowStatus !== 'draft') existing.workflowStatus = 'draft';
      existing.auditTrail.push(data.auditEntry);
      return existing.save();
    }

    return Marks.create({
      schoolId: data.schoolId,
      examId: data.examId,
      studentId: data.studentId,
      class: data.class,
      section: data.section,
      subjectName: data.subjectName,
      componentScores: data.componentScores,
      total: data.total,
      percentage: data.percentage,
      grade: data.grade,
      result: data.result,
      remark: data.remark,
      workflowStatus: 'draft',
      enteredById: data.enteredById,
      enteredByName: data.enteredByName,
      enteredAt: new Date(),
      auditTrail: [data.auditEntry],
      isDeleted: false,
    });
  },

  async bulkUpsert(records: UpsertMarksData[]): Promise<IMarks[]> {
    return Promise.all(records.map((r) => this.upsert(r)));
  },

  async findById(id: string, schoolId: string): Promise<IMarks | null> {
    return Marks.findOne({ _id: id, schoolId, isDeleted: false }).lean<IMarks>();
  },

  /** Full entry table for one class+section+subject+exam. */
  async findByBatch(target: BatchTarget): Promise<IMarks[]> {
    return Marks.find({
      schoolId: target.schoolId, examId: target.examId, class: target.class,
      section: target.section, subjectName: target.subjectName, isDeleted: false,
    }).lean<IMarks[]>();
  },

  /** All subjects for one student in one exam — used by report-card generation. */
  async findByStudentExam(schoolId: string, examId: string, studentId: string): Promise<IMarks[]> {
    return Marks.find({ schoolId, examId, studentId, isDeleted: false }).lean<IMarks[]>();
  },

  async findAll(schoolId: string, opts: FindMarksOptions): Promise<PaginatedMarks> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts.limit ?? 300));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.examId)         query.examId = opts.examId;
    if (opts.class)          query.class = opts.class;
    if (opts.section)        query.section = opts.section;
    if (opts.subjectName)    query.subjectName = opts.subjectName;
    if (opts.studentId)      query.studentId = opts.studentId;
    if (opts.workflowStatus) query.workflowStatus = opts.workflowStatus;

    const [records, total] = await Promise.all([
      Marks.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IMarks[]>(),
      Marks.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  /**
   * Bulk workflow-status transition for a batch, optionally scoped to specific
   * students. Every affected document gets the same audit entry appended.
   */
  async transitionBatch(
    target: BatchTarget,
    fromStatuses: MarksWorkflowStatus[],
    toStatus: MarksWorkflowStatus,
    auditEntry: IMarksAuditEntry,
    extraFields: Record<string, unknown>,
    studentIds?: string[],
  ): Promise<number> {
    const query: Record<string, unknown> = {
      schoolId: target.schoolId, examId: target.examId, class: target.class,
      section: target.section, subjectName: target.subjectName, isDeleted: false,
      workflowStatus: { $in: fromStatuses },
    };
    if (studentIds?.length) query.studentId = { $in: studentIds };

    const result = await Marks.updateMany(query, {
      $set: { workflowStatus: toStatus, ...extraFields },
      $push: { auditTrail: auditEntry },
    });
    return result.modifiedCount;
  },

  /** KPI strip counts for the marks-entry screen. */
  async getSummary(target: BatchTarget, totalStudentsInRoster: number): Promise<MarksSummary> {
    const records = await Marks.find({
      schoolId: target.schoolId, examId: target.examId, class: target.class,
      section: target.section, subjectName: target.subjectName, isDeleted: false,
    }).select('workflowStatus componentScores').lean<Pick<IMarks, 'workflowStatus' | 'componentScores'>[]>();

    const counts: Record<MarksWorkflowStatus, number> = {
      draft: 0, submitted: 0, needs_correction: 0, approved: 0, published: 0, locked: 0, reopened: 0,
    };
    let completed = 0;
    for (const r of records) {
      counts[r.workflowStatus] += 1;
      const allFilled = r.componentScores.every(
        (c) => c.status !== 'present' || typeof c.score === 'number',
      );
      if (allFilled) completed += 1;
    }

    return {
      totalStudents: totalStudentsInRoster,
      completed,
      pending: Math.max(0, totalStudentsInRoster - records.length),
      draft: counts.draft,
      submitted: counts.submitted,
      needsCorrection: counts.needs_correction,
      approved: counts.approved,
      published: counts.published,
      locked: counts.locked,
    };
  },
};
