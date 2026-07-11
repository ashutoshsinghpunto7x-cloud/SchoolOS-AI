import { teacherTimetableRepository } from './teacher-timetable.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { ITeacherTimetable, ITeacherTimetableEntry, TeacherTimetableStatus } from './teacher-timetable.model';
import {
  getOrCreateTeacherTimetableSchema, bulkUpdateTeacherTimetableEntriesSchema,
  updateTeacherTimetableStatusSchema,
} from './teacher-timetable.validation';
import { ForbiddenError, NotFoundError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

// Resolve User → Teacher via email, same convention as teacherWorkspaceService.resolveTeacher.
async function resolveTeacherId(ctx: AuthContext): Promise<string> {
  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your user account has no email — cannot link to a teacher profile');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean() as { _id: { toString(): string } } | null;
  if (!teacher) throw new NotFoundError('Teacher profile not found. Ask your administrator to set your email on the teacher record.');

  return String(teacher._id);
}

/**
 * Warns (does not block) when this teacher is already booked for the same
 * day/slot on a CLASS timetable — the two systems are independent by design
 * (see [[architecture_teacher_timetable]] memory), so this is advisory only.
 */
async function checkConflicts(schoolId: string, teacherId: string, entries: ITeacherTimetableEntry[]): Promise<string[]> {
  if (!entries.length) return [];
  const classSchedules = await timetableRepository.getTeacherSchedule(schoolId, teacherId);

  const conflicts: string[] = [];
  for (const entry of entries) {
    for (const tt of classSchedules) {
      const clash = tt.entries.find(
        (e) => e.dayOfWeek === entry.dayOfWeek && e.slotId === entry.slotId && e.teacherId === teacherId,
      );
      if (clash) {
        conflicts.push(
          `Already scheduled for Class ${tt.class}-${tt.section} (${clash.subjectName}) at this slot per the class timetable`,
        );
      }
    }
  }
  return conflicts;
}

export const teacherTimetableService = {
  async getOrCreate(rawInput: unknown, ctx: AuthContext): Promise<ITeacherTimetable> {
    const data = getOrCreateTeacherTimetableSchema.parse(rawInput);
    const tt = await teacherTimetableRepository.getOrCreate({
      schoolId: ctx.schoolId, ...data, createdBy: ctx.displayName,
    });
    return tt;
  },

  async getById(id: string, ctx: AuthContext): Promise<ITeacherTimetable> {
    const tt = await teacherTimetableRepository.findById(id, ctx.schoolId);
    if (!tt) throw new NotFoundError('Teacher timetable');
    return tt;
  },

  async getLatestForTeacher(teacherId: string, ctx: AuthContext): Promise<ITeacherTimetable | null> {
    return teacherTimetableRepository.findLatestForTeacher(ctx.schoolId, teacherId);
  },

  async getMine(ctx: AuthContext): Promise<ITeacherTimetable | null> {
    const teacherId = await resolveTeacherId(ctx);
    return teacherTimetableRepository.findLatestForTeacher(ctx.schoolId, teacherId);
  },

  async bulkUpdateEntries(id: string, rawInput: unknown, ctx: AuthContext): Promise<{ timetable: ITeacherTimetable; conflicts: string[] }> {
    const { entries } = bulkUpdateTeacherTimetableEntriesSchema.parse(rawInput);
    const existing = await teacherTimetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Teacher timetable');

    const conflicts = await checkConflicts(ctx.schoolId, existing.teacherId, entries as ITeacherTimetableEntry[]);

    const tt = await teacherTimetableRepository.bulkUpdateEntries(id, ctx.schoolId, entries as ITeacherTimetableEntry[], ctx.displayName);
    if (!tt) throw new NotFoundError('Teacher timetable');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'teacher_timetable.entries_updated', resource: 'teacher_timetables',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
      details: { teacherId: existing.teacherId, entryCount: entries.length, conflictCount: conflicts.length },
    });

    return { timetable: tt, conflicts };
  },

  async updateStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITeacherTimetable> {
    const { status } = updateTeacherTimetableStatusSchema.parse(rawInput);
    const existing = await teacherTimetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Teacher timetable');

    const extra: Record<string, unknown> = {};
    if (status === 'published') { extra.publishedAt = new Date(); extra.publishedBy = ctx.displayName; }

    const tt = await teacherTimetableRepository.updateStatus(id, ctx.schoolId, status as TeacherTimetableStatus, ctx.displayName, extra);
    if (!tt) throw new NotFoundError('Teacher timetable');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: status === 'published' ? 'teacher_timetable.published' : 'teacher_timetable.updated',
      resource: 'teacher_timetables', resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
      details: { from: existing.status, to: status },
    });
    return tt;
  },

  async delete(id: string, ctx: AuthContext): Promise<void> {
    const existing = await teacherTimetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Teacher timetable');
    await teacherTimetableRepository.softDelete(id, ctx.schoolId, ctx.displayName);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'teacher_timetable.deleted', resource: 'teacher_timetables',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
