import { behaviorOptionRepository } from './behavior-option.repository';
import { IBehaviorOption } from './behavior-option.model';
import { behaviorRecordRepository, PaginatedBehaviorRecords } from './behavior-record.repository';
import { IBehaviorRecord } from './behavior-record.model';
import {
  createBehaviorOptionSchema,
  updateBehaviorOptionSchema,
  singleBehaviorRecordSchema,
  bulkBehaviorRecordSchema,
  studentBehaviorHistorySchema,
  classBehaviorSchema,
} from './behavior.validation';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { studentRepository } from '../students/student.repository';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { classTeacherRepository } from '../classes/class-teacher.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { schoolSettingsService } from '../school-settings/school-settings.service';

// ── Teacher identity + authorization ─────────────────────────────────────────

// Resolves the calling teacher's Teacher._id from the logged-in user's email —
// same lookup used by attendance/marks, since Users and Teachers are separate
// collections linked only by email (see project_employee_teacher_mirror memory).
async function resolveTeacherId(ctx: AuthContext): Promise<string> {
  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class assignment');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean() as { _id: unknown } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  return String(teacher._id);
}

// A teacher may record behaviour for a class they're the class teacher of, OR
// any class/section they teach a subject in per the timetable — deliberately
// broader than attendance's "class teacher (or active substitute) only" rule,
// since day-to-day behaviour is something any of a student's teachers would
// plausibly observe and log, not just the homeroom teacher. Mirrors the
// subject-teacher check used for marks entry. No-op for admin/principal
// (school-wide authority already).
async function assertTeacherCanRecordBehavior(
  ctx: AuthContext,
  cls: string,
  section: string,
): Promise<string | null> {
  if (ctx.role !== 'teacher') return null;

  const teacherId = await resolveTeacherId(ctx);

  const assignment = await classTeacherRepository.findOne(ctx.schoolId, cls, section);
  if (assignment && assignment.teacherId === teacherId) return teacherId;

  const timetable = await timetableRepository.findByClassSectionAnyYear(ctx.schoolId, cls, section);
  const teaches = (timetable?.entries ?? []).some((e) => e.teacherId === teacherId);
  if (!teaches) {
    throw new ForbiddenError('You do not teach this class — only a teacher assigned to this class/section can record behaviour');
  }

  return teacherId;
}

// ── Window helpers ────────────────────────────────────────────────────────────

// HH:mm in IST — same convention as staff-attendance.service.ts's currentTime helper.
function currentISTTime(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export interface BehaviorWindowStatus {
  isOpen: boolean;
  startTime: string;
  endTime: string;
  date: string;
}

async function getWindowStatus(schoolId: string): Promise<BehaviorWindowStatus> {
  const settings = await schoolSettingsService.getSettings(schoolId);
  const { startTime, endTime } = settings.behaviorWindow;
  const now = currentISTTime();
  const isOpen = now >= startTime && now <= endTime;
  return { isOpen, startTime, endTime, date: behaviorRecordRepository.todayString() };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const behaviorService = {
  // ── Options ─────────────────────────────────────────────────────────────

  /** School-wide active options + (for a teacher) their own custom options.
   *  Admin/principal additionally see deactivated options, for management. */
  async listOptions(ctx: AuthContext): Promise<IBehaviorOption[]> {
    await behaviorOptionRepository.ensureDefaults(ctx.schoolId);
    const isTeacher = ctx.role === 'teacher';
    const teacherId = isTeacher ? await resolveTeacherId(ctx) : undefined;
    return behaviorOptionRepository.findVisible(ctx.schoolId, teacherId, !isTeacher);
  },

  /** Admin/principal create a school-wide option; a teacher creates one scoped
   *  to just themselves (createdByTeacherId set). */
  async createOption(rawInput: unknown, ctx: AuthContext): Promise<IBehaviorOption> {
    const data = createBehaviorOptionSchema.parse(rawInput);
    const isTeacher = ctx.role === 'teacher';
    const createdByTeacherId = isTeacher ? await resolveTeacherId(ctx) : undefined;

    const option = await behaviorOptionRepository.create({
      schoolId: ctx.schoolId,
      label:    data.label,
      category: data.category,
      createdByTeacherId,
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'behavior.option_created', resource: 'behavior_option', resourceId: option._id.toString(),
      details: { label: data.label, category: data.category, scope: isTeacher ? 'teacher' : 'school' },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return option;
  },

  /** Admin/principal may edit or deactivate any option (including the 6 seeded
   *  defaults — no hard delete, matching the rest of the codebase's soft-delete
   *  convention). A teacher may only edit/deactivate their own custom options. */
  async updateOption(id: string, rawInput: unknown, ctx: AuthContext): Promise<IBehaviorOption> {
    const data = updateBehaviorOptionSchema.parse(rawInput);
    if (data.label === undefined && data.category === undefined && data.isActive === undefined) {
      throw new ValidationError('No fields to update');
    }

    const existing = await behaviorOptionRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Behaviour option');

    if (ctx.role === 'teacher') {
      const teacherId = await resolveTeacherId(ctx);
      if (existing.createdByTeacherId !== teacherId) {
        throw new ForbiddenError('You can only edit or deactivate your own custom behaviour options');
      }
    }

    const updated = await behaviorOptionRepository.update(id, ctx.schoolId, data);
    if (!updated) throw new NotFoundError('Behaviour option');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'behavior.option_updated', resource: 'behavior_option', resourceId: id,
      details: { ...data }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  // ── Window ──────────────────────────────────────────────────────────────

  async getWindowStatus(ctx: AuthContext): Promise<BehaviorWindowStatus> {
    return getWindowStatus(ctx.schoolId);
  },

  // ── Records ─────────────────────────────────────────────────────────────

  async markSingle(rawInput: unknown, ctx: AuthContext): Promise<IBehaviorRecord> {
    const data = singleBehaviorRecordSchema.parse(rawInput);

    if (ctx.role === 'teacher') {
      const window = await getWindowStatus(ctx.schoolId);
      if (!window.isOpen) {
        throw new ValidationError(`Behaviour marking is closed for today. It's open ${window.startTime}–${window.endTime}.`);
      }
      if (data.date !== behaviorRecordRepository.todayString()) {
        throw new ValidationError('Behaviour can only be marked for today');
      }
    }
    await assertTeacherCanRecordBehavior(ctx, data.class, data.section);

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const option = await behaviorOptionRepository.findById(data.optionId, ctx.schoolId);
    if (!option || !option.isActive) throw new NotFoundError('Behaviour option');

    const record = await behaviorRecordRepository.create({
      studentId:   data.studentId,
      schoolId:    ctx.schoolId,
      class:       data.class,
      section:     data.section,
      date:        data.date,
      optionId:    data.optionId,
      optionLabel: option.label,
      category:    option.category,
      note:        data.note,
      markedById:  ctx.userId,
      markedByName: ctx.displayName,
      markedAt:    new Date(),
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'behavior.marked', resource: 'behavior_record', resourceId: record._id.toString(),
      details: { studentId: data.studentId, date: data.date, optionLabel: option.label },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async bulkMark(rawInput: unknown, ctx: AuthContext): Promise<IBehaviorRecord[]> {
    const data = bulkBehaviorRecordSchema.parse(rawInput);

    if (ctx.role === 'teacher') {
      const window = await getWindowStatus(ctx.schoolId);
      if (!window.isOpen) {
        throw new ValidationError(`Behaviour marking is closed for today. It's open ${window.startTime}–${window.endTime}.`);
      }
      if (data.date !== behaviorRecordRepository.todayString()) {
        throw new ValidationError('Behaviour can only be marked for today');
      }
    }
    await assertTeacherCanRecordBehavior(ctx, data.class, data.section);

    const optionIds = [...new Set(data.records.map((r) => r.optionId))];
    const options = await Promise.all(optionIds.map((id) => behaviorOptionRepository.findById(id, ctx.schoolId)));
    const optionById = new Map(
      options.filter((o): o is IBehaviorOption => !!o).map((o) => [String(o._id), o]),
    );

    for (const r of data.records) {
      const option = optionById.get(r.optionId);
      if (!option || !option.isActive) throw new NotFoundError(`Behaviour option ${r.optionId}`);
    }

    const records = await behaviorRecordRepository.bulkCreate(
      data.records.map((r) => {
        const option = optionById.get(r.optionId)!;
        return {
          studentId:   r.studentId,
          schoolId:    ctx.schoolId,
          class:       data.class,
          section:     data.section,
          date:        data.date,
          optionId:    r.optionId,
          optionLabel: option.label,
          category:    option.category,
          note:        r.note,
          markedById:  ctx.userId,
          markedByName: ctx.displayName,
          markedAt:    new Date(),
        };
      }),
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'behavior.bulk_marked', resource: 'behavior_record', resourceId: `${data.class}-${data.section}-${data.date}`,
      details: { class: data.class, section: data.section, date: data.date, count: records.length },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return records;
  },

  async getClassRecords(cls: string, section: string, rawQuery: unknown, ctx: AuthContext): Promise<IBehaviorRecord[]> {
    const { date } = classBehaviorSchema.parse(rawQuery);
    const targetDate = date ?? behaviorRecordRepository.todayString();
    return behaviorRecordRepository.findByClassDate(ctx.schoolId, cls, section, targetDate);
  },

  async getStudentHistory(studentId: string, rawQuery: unknown, ctx: AuthContext): Promise<PaginatedBehaviorRecords> {
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const opts = studentBehaviorHistorySchema.parse(rawQuery);
    return behaviorRecordRepository.findByStudent(ctx.schoolId, studentId, opts);
  },

  async deleteRecord(id: string, ctx: AuthContext): Promise<void> {
    const existing = await behaviorRecordRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Behaviour record');

    const deleted = await behaviorRecordRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Behaviour record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'behavior.deleted', resource: 'behavior_record', resourceId: id,
      details: { studentId: existing.studentId, date: existing.date },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
