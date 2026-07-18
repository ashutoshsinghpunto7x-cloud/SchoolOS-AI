import { marksRepository, PaginatedMarks, MarksSummary } from './marks.repository';
import { IMarks, IComponentScore, IMarksAuditEntry, ResultStatus } from './marks.model';
import { IExam } from '../exams/exam.model';
import {
  upsertMarksSchema,
  bulkUpsertMarksSchema,
  marksBatchTargetSchema,
  reviewActionSchema,
  reopenActionSchema,
  listMarksSchema,
  entryTableQuerySchema,
} from './marks.validation';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { examRepository } from '../exams/exam.repository';
import { studentRepository } from '../students/student.repository';
import { Student } from '../students/student.model';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { timetableRepository } from '../timetable/timetable.repository';

// ── Teacher scope guard ────────────────────────────────────────────────────────
// A subject teacher may only enter marks for a class+section+subject they
// actually teach. The timetable (per-period entries with teacherId +
// subjectName) is the real source of truth for this — mirrors exactly how
// teacher-workspace.service.ts derives "subjects taught" for the same
// teacher's dashboard/class-picker. Teacher.assignedClasses/subjects are
// separate legacy fields that aren't kept in sync with the timetable, so
// they're not used here. Admin/principal bypass this entirely.
async function assertTeacherCanEnterMarks(ctx: AuthContext, cls: string, section: string, subjectName: string): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class/subject assignment');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean() as { _id: unknown } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  const teacherId = String(teacher._id);
  const timetable = await timetableRepository.findByClassSectionAnyYear(ctx.schoolId, cls, section);
  const teaches = (timetable?.entries ?? []).some((e) => e.teacherId === teacherId && e.subjectName === subjectName);
  if (!teaches) {
    throw new ForbiddenError('You do not teach this subject in this class');
  }
}

// ── Result computation ─────────────────────────────────────────────────────────

interface ComputedResult {
  total?: number;
  percentage?: number;
  grade?: string;
  result: ResultStatus;
}

function computeResult(componentScores: IComponentScore[], exam: Pick<IExam, 'components' | 'gradingBands' | 'passPercent'>): ComputedResult {
  const maxMarksByComponent = new Map(exam.components.map((c) => [c.name, c.maxMarks]));

  let scored = 0;
  let maxTotal = 0;
  let anyCounted = false;

  for (const cs of componentScores) {
    const maxMarks = maxMarksByComponent.get(cs.componentName) ?? 0;
    if (cs.status === 'exempt' || cs.status === 'not_assessed') continue; // excluded from both sides
    anyCounted = true;
    maxTotal += maxMarks;
    if (cs.status === 'present') scored += cs.score ?? 0;
    // 'absent' / 'medical' contribute 0 to the numerator but still count toward maxTotal
  }

  if (!anyCounted || maxTotal === 0) {
    return { result: 'na' };
  }

  const percentage = Math.round((scored / maxTotal) * 10000) / 100; // 2 decimal places
  const band = exam.gradingBands.find((b) => percentage >= b.minPercent && percentage <= b.maxPercent);

  return {
    total: scored,
    percentage,
    grade: band?.label,
    result: percentage >= exam.passPercent ? 'pass' : 'fail',
  };
}

function validateComponentScores(componentScores: IComponentScore[], exam: Pick<IExam, 'components'>): void {
  const maxMarksByComponent = new Map(exam.components.map((c) => [c.name, c.maxMarks]));
  const validNames = new Set(exam.components.map((c) => c.name));

  for (const cs of componentScores) {
    if (!validNames.has(cs.componentName)) {
      throw new ValidationError(`"${cs.componentName}" is not a component of this exam`);
    }
    if (cs.status === 'present') {
      const max = maxMarksByComponent.get(cs.componentName) ?? 0;
      if (typeof cs.score !== 'number') {
        throw new ValidationError(`${cs.componentName}: score is required when status is present`);
      }
      if (cs.score < 0) throw new ValidationError(`${cs.componentName}: score cannot be negative`);
      if (cs.score > max) throw new ValidationError(`${cs.componentName}: ${cs.score} exceeds max marks (${max})`);
    }
  }
}

function makeAuditEntry(action: string, ctx: AuthContext, reason?: string, fromValue?: string, toValue?: string): IMarksAuditEntry {
  return {
    action,
    byUserId: ctx.userId,
    byName: ctx.displayName,
    reason,
    fromValue,
    toValue,
    at: new Date(),
  };
}

async function loadConfiguredExam(examId: string, schoolId: string): Promise<IExam> {
  const exam = await examRepository.findById(examId, schoolId);
  if (!exam) throw new NotFoundError('Exam');
  if (exam.status === 'draft') {
    throw new ValidationError('This exam is still in draft — ask an admin to configure it before entering marks');
  }
  return exam;
}

export const marksService = {
  async upsertSingle(rawInput: unknown, ctx: AuthContext): Promise<IMarks> {
    const data = upsertMarksSchema.parse(rawInput);
    await assertTeacherCanEnterMarks(ctx, data.class, data.section, data.subjectName);

    const exam = await loadConfiguredExam(data.examId, ctx.schoolId);
    if (!exam.classesApplicable.includes(data.class)) throw new ValidationError('This exam does not apply to this class');

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    validateComponentScores(data.componentScores, exam);
    const computed = computeResult(data.componentScores, exam);

    const record = await marksRepository.upsert({
      schoolId: ctx.schoolId,
      examId: data.examId,
      studentId: data.studentId,
      class: data.class,
      section: data.section,
      subjectName: data.subjectName,
      componentScores: data.componentScores,
      ...computed,
      remark: data.remark,
      enteredById: ctx.userId,
      enteredByName: ctx.displayName,
      auditEntry: makeAuditEntry('marks.saved', ctx),
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.saved', resource: 'marks',
      resourceId: record._id.toString(),
      details: { studentId: data.studentId, examId: data.examId, subjectName: data.subjectName },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async bulkUpsert(rawInput: unknown, ctx: AuthContext): Promise<IMarks[]> {
    const data = bulkUpsertMarksSchema.parse(rawInput);
    await assertTeacherCanEnterMarks(ctx, data.class, data.section, data.subjectName);

    const exam = await loadConfiguredExam(data.examId, ctx.schoolId);
    if (!exam.classesApplicable.includes(data.class)) throw new ValidationError('This exam does not apply to this class');

    for (const r of data.records) validateComponentScores(r.componentScores, exam);

    const records = await marksRepository.bulkUpsert(
      data.records.map((r) => {
        const computed = computeResult(r.componentScores, exam);
        return {
          schoolId: ctx.schoolId,
          examId: data.examId,
          studentId: r.studentId,
          class: data.class,
          section: data.section,
          subjectName: data.subjectName,
          componentScores: r.componentScores,
          ...computed,
          remark: r.remark,
          enteredById: ctx.userId,
          enteredByName: ctx.displayName,
          auditEntry: makeAuditEntry('marks.bulk_saved', ctx),
        };
      })
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.bulk_saved', resource: 'marks',
      resourceId: `${data.class}-${data.section}-${data.examId}-${data.subjectName}`,
      details: { class: data.class, section: data.section, examId: data.examId, subjectName: data.subjectName, count: records.length },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return records;
  },

  async getById(id: string, ctx: AuthContext): Promise<IMarks> {
    const record = await marksRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Marks record');
    return record;
  },

  /** Editable entry table: full class roster merged with any existing marks for this subject+exam. */
  async getEntryTable(rawQuery: unknown, ctx: AuthContext): Promise<{
    exam: IExam;
    rows: { studentId: string; fullName: string; rollNumber?: string; marks: IMarks | null }[];
  }> {
    const query = entryTableQuerySchema.parse(rawQuery);
    await assertTeacherCanEnterMarks(ctx, query.class, query.section, query.subjectName);

    const exam = await examRepository.findById(query.examId, ctx.schoolId);
    if (!exam) throw new NotFoundError('Exam');

    const [students, marksRecords] = await Promise.all([
      Student.find({ schoolId: ctx.schoolId, class: query.class, section: query.section, admissionStatus: 'active', isDeleted: false })
        .select('_id fullName rollNumber')
        .sort({ rollNumber: 1, fullName: 1 })
        .lean<{ _id: unknown; fullName: string; rollNumber?: string }[]>(),
      marksRepository.findByBatch({ schoolId: ctx.schoolId, examId: query.examId, class: query.class, section: query.section, subjectName: query.subjectName }),
    ]);

    const marksByStudent = new Map(marksRecords.map((m) => [m.studentId, m]));

    return {
      exam,
      rows: students.map((s) => ({
        studentId: String(s._id),
        fullName: s.fullName,
        rollNumber: s.rollNumber,
        marks: marksByStudent.get(String(s._id)) ?? null,
      })),
    };
  },

  async getSummary(rawQuery: unknown, ctx: AuthContext): Promise<MarksSummary> {
    const query = entryTableQuerySchema.parse(rawQuery);
    await assertTeacherCanEnterMarks(ctx, query.class, query.section, query.subjectName);
    const totalStudents = await Student.countDocuments({
      schoolId: ctx.schoolId, class: query.class, section: query.section, admissionStatus: 'active', isDeleted: false,
    });
    return marksRepository.getSummary(
      { schoolId: ctx.schoolId, examId: query.examId, class: query.class, section: query.section, subjectName: query.subjectName },
      totalStudents,
    );
  },

  async listAll(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedMarks> {
    const opts = listMarksSchema.parse(rawQuery);
    return marksRepository.findAll(ctx.schoolId, opts);
  },

  /** Teacher submits a class+subject+exam's drafts for admin/principal review. */
  async submitForReview(rawInput: unknown, ctx: AuthContext): Promise<{ updated: number }> {
    const target = marksBatchTargetSchema.parse(rawInput);
    await assertTeacherCanEnterMarks(ctx, target.class, target.section, target.subjectName);

    const records = await marksRepository.findByBatch({ schoolId: ctx.schoolId, ...target });
    if (records.length === 0) throw new ValidationError('No marks entered yet for this class and subject');

    const incomplete = records.filter((r) =>
      r.componentScores.some((c) => c.status === 'present' && typeof c.score !== 'number'),
    );
    if (incomplete.length > 0) {
      throw new ValidationError(`${incomplete.length} student(s) have missing marks. Fix them before submitting.`);
    }

    const updated = await marksRepository.transitionBatch(
      { schoolId: ctx.schoolId, ...target },
      ['draft', 'needs_correction'],
      'submitted',
      makeAuditEntry('marks.submitted', ctx),
      {},
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.submitted', resource: 'marks',
      resourceId: `${target.class}-${target.section}-${target.examId}-${target.subjectName}`,
      details: { ...target, updated }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { updated };
  },

  /** Admin/principal approves a submitted batch (optionally a subset of students). */
  async approve(rawInput: unknown, ctx: AuthContext): Promise<{ updated: number }> {
    const data = reviewActionSchema.parse(rawInput);
    const updated = await marksRepository.transitionBatch(
      { schoolId: ctx.schoolId, examId: data.examId, class: data.class, section: data.section, subjectName: data.subjectName },
      ['submitted'],
      'approved',
      makeAuditEntry('marks.approved', ctx, data.reason),
      { approvedById: ctx.userId, approvedByName: ctx.displayName, approvedAt: new Date() },
      data.studentIds,
    );
    if (updated === 0) throw new ValidationError('No submitted marks found to approve');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.approved', resource: 'marks',
      resourceId: `${data.class}-${data.section}-${data.examId}-${data.subjectName}`,
      details: { ...data, updated }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { updated };
  },

  /** Admin/principal sends a submitted batch back for correction — a reason is required so the teacher knows what to fix. */
  async requestCorrection(rawInput: unknown, ctx: AuthContext): Promise<{ updated: number }> {
    const data = reviewActionSchema.parse(rawInput);
    if (!data.reason?.trim()) throw new ValidationError('A reason is required when requesting correction');

    const updated = await marksRepository.transitionBatch(
      { schoolId: ctx.schoolId, examId: data.examId, class: data.class, section: data.section, subjectName: data.subjectName },
      ['submitted'],
      'needs_correction',
      makeAuditEntry('marks.correction_requested', ctx, data.reason),
      {},
      data.studentIds,
    );
    if (updated === 0) throw new ValidationError('No submitted marks found to send back');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.correction_requested', resource: 'marks',
      resourceId: `${data.class}-${data.section}-${data.examId}-${data.subjectName}`,
      details: { ...data, updated }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { updated };
  },

  /** Admin/principal publishes an approved batch — visible to teachers/report cards from here on. */
  async publish(rawInput: unknown, ctx: AuthContext): Promise<{ updated: number }> {
    const target = marksBatchTargetSchema.parse(rawInput);
    const updated = await marksRepository.transitionBatch(
      { schoolId: ctx.schoolId, ...target },
      ['approved'],
      'published',
      makeAuditEntry('marks.published', ctx),
      { publishedById: ctx.userId, publishedByName: ctx.displayName, publishedAt: new Date() },
    );
    if (updated === 0) throw new ValidationError('No approved marks found to publish');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.published', resource: 'marks',
      resourceId: `${target.class}-${target.section}-${target.examId}-${target.subjectName}`,
      details: { ...target, updated }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { updated };
  },

  /** Locks a published batch against any further edits (including by admin) until explicitly reopened. */
  async lock(rawInput: unknown, ctx: AuthContext): Promise<{ updated: number }> {
    const target = marksBatchTargetSchema.parse(rawInput);
    const updated = await marksRepository.transitionBatch(
      { schoolId: ctx.schoolId, ...target },
      ['published'],
      'locked',
      makeAuditEntry('marks.locked', ctx),
      {},
    );
    if (updated === 0) throw new ValidationError('No published marks found to lock');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.locked', resource: 'marks',
      resourceId: `${target.class}-${target.section}-${target.examId}-${target.subjectName}`,
      details: { ...target, updated }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { updated };
  },

  /** Reopens a published/locked batch for correction — always requires a reason, recorded in the audit trail. */
  async reopen(rawInput: unknown, ctx: AuthContext): Promise<{ updated: number }> {
    const data = reopenActionSchema.parse(rawInput);
    const updated = await marksRepository.transitionBatch(
      { schoolId: ctx.schoolId, examId: data.examId, class: data.class, section: data.section, subjectName: data.subjectName },
      ['published', 'locked'],
      'reopened',
      makeAuditEntry('marks.reopened', ctx, data.reason),
      {},
    );
    if (updated === 0) throw new ValidationError('No published or locked marks found to reopen');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.reopened', resource: 'marks',
      resourceId: `${data.class}-${data.section}-${data.examId}-${data.subjectName}`,
      details: { ...data, updated }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { updated };
  },
};
