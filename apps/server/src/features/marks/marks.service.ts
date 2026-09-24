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
  deleteBulkMarksSchema,
} from './marks.validation';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { examRepository } from '../exams/exam.repository';
import { studentRepository } from '../students/student.repository';
import { Student } from '../students/student.model';

// ── Teacher scope guard ────────────────────────────────────────────────────────
// Marks access is intentionally open school-wide (2026-09-16): any teacher
// may view and enter marks for any class/section/subject, not just the ones
// they're timetabled for — this was a deliberate product decision, not an
// oversight. What still protects a saved record is the per-record edit lock
// below (assertCanEditExisting): once a teacher has saved marks, only that
// same account (or admin/principal) can edit them afterward. This function
// is kept as a no-op call site (rather than deleted) so re-introducing a
// scope restriction later is a one-line change, and so `exam`/`cls`/
// `section`/`subjectName` stay available at every call site if needed again.
async function assertTeacherCanEnterMarks(
  _ctx: AuthContext, _cls: string, _section: string, _subjectName: string,
  _exam?: Pick<IExam, 'subjectConfigs'> | null,
): Promise<void> {
  // Intentionally no-op — see comment above.
}

// ── Per-record edit lock ────────────────────────────────────────────────────────
// Once a teacher saves a marks record, only that same account may edit it
// again — a different teacher (even one now also permitted to enter marks
// for this class/subject under the open-access policy above) gets a
// read-only view instead. Admin/principal are never blocked by this.
async function assertCanEditExisting(
  existing: { enteredById: string; enteredByName: string; enteredByRole?: string } | null,
  ctx: AuthContext,
): Promise<void> {
  if (!existing) return;
  // Only a teacher-entered record locks out other teachers — one a
  // principal/admin created (e.g. covering a gap) stays open to whichever
  // teacher picks it up, so a supervisory save never strands the real
  // subject teacher out of their own class.
  if (ctx.role === 'teacher' && existing.enteredById !== ctx.userId && existing.enteredByRole === 'teacher') {
    throw new ForbiddenError(`These marks were entered by ${existing.enteredByName} — only they can edit them`);
  }
}

// Once a teacher has entered ANY student's marks for a given class+section+
// subject+exam, the still-blank students in that same sheet are reserved for
// them too — a second teacher can't "fill in the gaps" of someone else's
// sheet even though open access lets them open it. Mirrors
// assertCanEditExisting's per-record rule, just applied before a record
// exists yet.
function findBatchOwner(
  batchRecords: { enteredById: string; enteredByName: string; enteredByRole?: string }[],
  ctx: AuthContext,
): { enteredById: string; enteredByName: string } | null {
  const owner = batchRecords.find((r) => r.enteredByRole === 'teacher' && r.enteredById !== ctx.userId);
  return owner ? { enteredById: owner.enteredById, enteredByName: owner.enteredByName } : null;
}

function assertCanEnterNewRecord(owner: { enteredById: string; enteredByName: string } | null, ctx: AuthContext): void {
  if (owner && ctx.role === 'teacher') {
    throw new ForbiddenError(`These marks are being entered by ${owner.enteredByName} — only they can add the remaining students`);
  }
}

// ── Delete authorization ────────────────────────────────────────────────────────
// A teacher may only delete marks they themselves entered. Principal/admin can
// delete any record — same override the review workflow already grants them.
function canDeleteRecord(record: { enteredById: string; enteredByRole?: string }, ctx: AuthContext): boolean {
  if (ctx.role === 'admin' || ctx.role === 'principal') return true;
  return record.enteredById === ctx.userId;
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
    const exam = await loadConfiguredExam(data.examId, ctx.schoolId);
    await assertTeacherCanEnterMarks(ctx, data.class, data.section, data.subjectName, exam);

    if (!exam.classesApplicable.includes(data.class)) throw new ValidationError('This exam does not apply to this class');

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const existing = await marksRepository.findExisting(ctx.schoolId, data.examId, data.studentId, data.subjectName);
    if (existing) {
      await assertCanEditExisting(existing, ctx);
    } else if (ctx.role === 'teacher') {
      const batchRecords = await marksRepository.findByBatch({
        schoolId: ctx.schoolId, examId: data.examId, class: data.class, section: data.section, subjectName: data.subjectName,
      });
      assertCanEnterNewRecord(findBatchOwner(batchRecords, ctx), ctx);
    }

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
      enteredByRole: ctx.role,
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
    const exam = await loadConfiguredExam(data.examId, ctx.schoolId);
    await assertTeacherCanEnterMarks(ctx, data.class, data.section, data.subjectName, exam);

    if (!exam.classesApplicable.includes(data.class)) throw new ValidationError('This exam does not apply to this class');

    for (const r of data.records) validateComponentScores(r.componentScores, exam);

    // A teacher may be resubmitting a batch that includes some students
    // another teacher already entered marks for (open class/subject access
    // means overlap is now possible) — silently skip those locked rows
    // rather than failing the whole batch, since the entry-table UI already
    // renders them read-only and shouldn't have sent them in the first place.
    // The still-blank students (no existing record) are skipped the same way
    // once another teacher owns this batch — see findBatchOwner.
    const batchRecords = ctx.role === 'teacher'
      ? await marksRepository.findByBatch({ schoolId: ctx.schoolId, examId: data.examId, class: data.class, section: data.section, subjectName: data.subjectName })
      : [];
    const existingByStudent = new Map<string, IMarks>(batchRecords.map((m) => [m.studentId, m]));
    const batchOwner = findBatchOwner(batchRecords, ctx);
    const editable = data.records.filter((r) => {
      const existing = existingByStudent.get(r.studentId);
      // Same rule as assertCanEditExisting: a principal/admin-entered record
      // (enteredByRole !== 'teacher') never locks another teacher out.
      if (existing) return existing.enteredById === ctx.userId || existing.enteredByRole !== 'teacher';
      return !batchOwner;
    });

    const records = await marksRepository.bulkUpsert(
      editable.map((r) => {
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
          enteredByRole: ctx.role,
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
    const exam = await examRepository.findById(query.examId, ctx.schoolId);
    if (!exam) throw new NotFoundError('Exam');
    await assertTeacherCanEnterMarks(ctx, query.class, query.section, query.subjectName, exam);

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
    const exam = await examRepository.findById(query.examId, ctx.schoolId);
    await assertTeacherCanEnterMarks(ctx, query.class, query.section, query.subjectName, exam);
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
    const exam = await examRepository.findById(target.examId, ctx.schoolId);
    await assertTeacherCanEnterMarks(ctx, target.class, target.section, target.subjectName, exam);

    const records = await marksRepository.findByBatch({ schoolId: ctx.schoolId, ...target });
    if (records.length === 0) throw new ValidationError('No marks entered yet for this class and subject');

    // A teacher may only submit the records they themselves entered — a
    // record another teacher entered (open class/subject access allows
    // overlap) stays out of scope, the same rule as assertCanEditExisting
    // and bulkUpsert's per-record edit lock above.
    const ownRecords = ctx.role === 'teacher'
      ? records.filter((r) => r.enteredById === ctx.userId || r.enteredByRole !== 'teacher')
      : records;

    if (ownRecords.length === 0) {
      throw new ForbiddenError('These marks were entered by another teacher — only they can submit them for review');
    }

    const incomplete = ownRecords.filter((r) =>
      r.componentScores.some((c) => c.status === 'present' && typeof c.score !== 'number'),
    );
    if (incomplete.length > 0) {
      throw new ValidationError(`${incomplete.length} student(s) have missing marks. Fix them before submitting.`);
    }

    const studentIds = ctx.role === 'teacher' ? ownRecords.map((r) => r.studentId) : undefined;

    const updated = await marksRepository.transitionBatch(
      { schoolId: ctx.schoolId, ...target },
      ['draft', 'needs_correction'],
      'submitted',
      makeAuditEntry('marks.submitted', ctx),
      {},
      studentIds,
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

  /** Deletes a single student's marks record — the entering teacher or an
   *  admin/principal only. */
  async deleteOne(id: string, ctx: AuthContext): Promise<void> {
    const record = await marksRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Marks record');
    if (!canDeleteRecord(record, ctx)) {
      throw new ForbiddenError(`These marks were entered by ${record.enteredByName} — only they or a principal can delete them`);
    }
    if (record.workflowStatus === 'locked') {
      throw new ValidationError('These marks are locked — ask an admin to reopen them before deleting');
    }

    await marksRepository.softDelete(id, ctx.schoolId, ctx.userId);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.deleted', resource: 'marks',
      resourceId: id,
      details: { studentId: record.studentId, examId: record.examId, subjectName: record.subjectName },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  /** Deletes several marks records by id in one call (bulk-select delete on the
   *  entry table). Records the caller isn't allowed to delete are silently
   *  skipped rather than failing the whole request. */
  async deleteBulk(rawInput: unknown, ctx: AuthContext): Promise<{ deleted: number; skipped: number }> {
    const data = deleteBulkMarksSchema.parse(rawInput);
    const records = await marksRepository.findByIds(data.ids, ctx.schoolId);

    const deletable = records.filter((r) => canDeleteRecord(r, ctx) && r.workflowStatus !== 'locked');
    const skipped = data.ids.length - deletable.length;
    if (deletable.length === 0) {
      throw new ForbiddenError('None of the selected marks can be deleted — they were entered by other teachers, or are locked');
    }

    const ids = deletable.map((r) => r._id.toString());
    const deleted = await marksRepository.softDeleteMany(ids, ctx.schoolId, ctx.userId);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.bulk_deleted', resource: 'marks',
      resourceId: ids.join(','),
      details: { count: deleted, studentIds: deletable.map((r) => r.studentId) },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { deleted, skipped };
  },

  /** Deletes an entire class+section+subject+exam batch in one go — for a
   *  teacher this only removes the records they themselves entered; a
   *  principal/admin can clear the whole batch. */
  async deleteBatch(rawInput: unknown, ctx: AuthContext): Promise<{ deleted: number; skipped: number }> {
    const target = marksBatchTargetSchema.parse(rawInput);
    const records = await marksRepository.findByBatch({ schoolId: ctx.schoolId, ...target });
    if (records.length === 0) throw new ValidationError('No marks found for this class and subject');

    const deletable = records.filter((r) => canDeleteRecord(r, ctx) && r.workflowStatus !== 'locked');
    const skipped = records.length - deletable.length;
    if (deletable.length === 0) {
      throw new ForbiddenError('These marks were entered by another teacher, or are locked — only they or a principal can delete them');
    }

    // Always scope to the exact deletable set (not just for teachers) so a
    // locked record never gets swept up in a principal's "delete all" either.
    const studentIds = deletable.map((r) => r.studentId);
    const deleted = await marksRepository.softDeleteBatch({ schoolId: ctx.schoolId, ...target }, ctx.userId, studentIds);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'marks.batch_deleted', resource: 'marks',
      resourceId: `${target.class}-${target.section}-${target.examId}-${target.subjectName}`,
      details: { ...target, deleted, skipped }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { deleted, skipped };
  },
};
