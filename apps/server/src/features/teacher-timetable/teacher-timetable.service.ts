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
import { logger } from '../../lib/logger';

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
 * Auto-sync into each affected CLASS timetable whenever a teacher's personal
 * timetable entries change — the reverse of timetableService's class→teacher
 * sync. Diffs old vs new entries by (dayOfWeek, slotId): a slot whose
 * class/section was removed or changed pulls the entry from the old class's
 * timetable; a slot with a class/section assigned (new or changed) pushes it
 * to that class's timetable, creating the class timetable first if it
 * doesn't exist yet for this academic year. Best-effort — sync failures are
 * logged but never block the teacher timetable save itself.
 */
async function syncClassTimetables(
  schoolId: string, teacherId: string, teacherName: string, academicYear: string,
  oldEntries: ITeacherTimetableEntry[], newEntries: ITeacherTimetableEntry[], updatedBy: string,
): Promise<void> {
  const key = (e: { dayOfWeek: number; slotId: string }) => `${e.dayOfWeek}::${e.slotId}`;
  const oldByKey = new Map(oldEntries.map((e) => [key(e), e]));
  const newByKey = new Map(newEntries.map((e) => [key(e), e]));
  const allKeys = new Set([...oldByKey.keys(), ...newByKey.keys()]);

  for (const k of allKeys) {
    const before = oldByKey.get(k);
    const after = newByKey.get(k);
    if (
      before?.class === after?.class && before?.section === after?.section &&
      before?.subjectName === after?.subjectName && before?.roomNumber === after?.roomNumber
    ) continue;

    try {
      // Pull from the old class's timetable if this slot moved away or was removed —
      // but only if it's still our own synced entry, so a reassignment made directly
      // on the class timetable is never silently clobbered.
      if (before?.class && before.section && (before.class !== after?.class || before.section !== after?.section)) {
        const oldTt = await timetableRepository.findByClassSection(schoolId, before.class, before.section, academicYear);
        if (oldTt) {
          const oldEntry = oldTt.entries.find((e) => e.dayOfWeek === before.dayOfWeek && e.slotId === before.slotId);
          if (oldEntry?.teacherId === teacherId) {
            const oldTtId = String((oldTt as unknown as { _id: unknown })._id);
            await timetableRepository.removeEntry(oldTtId, schoolId, before.dayOfWeek, before.slotId, updatedBy);
          }
        }
      }
      // Push to the new/current class's timetable.
      if (after?.class && after.section) {
        let classTt = await timetableRepository.findByClassSection(schoolId, after.class, after.section, academicYear);
        if (!classTt) {
          classTt = await timetableRepository.create({
            schoolId, class: after.class, section: after.section, academicYear, createdBy: updatedBy,
          });
        }
        const classTtId = String((classTt as unknown as { _id: unknown })._id);
        await timetableRepository.upsertEntry(classTtId, schoolId, {
          dayOfWeek: after.dayOfWeek, slotId: after.slotId, subjectName: after.subjectName,
          teacherId, teacherName, roomNumber: after.roomNumber, updatedBy,
        });
      }
    } catch (err) {
      logger.error('[teacherTimetableService] Class timetable sync failed', { schoolId, teacherId, err });
    }
  }
}

/**
 * Warns (does not block) when this teacher is already booked for the same
 * day/slot on a DIFFERENT class's timetable — advisory only, since the class
 * timetable is the source of truth for conflict blocking (see
 * timetableService.upsertEntry). A match against the very class/section this
 * entry itself names is the normal, expected steady state (that's exactly
 * what syncClassTimetables just wrote), not a double-booking — only a match
 * against some *other* class/section is a genuine conflict.
 */
async function checkConflicts(schoolId: string, teacherId: string, entries: ITeacherTimetableEntry[]): Promise<string[]> {
  if (!entries.length) return [];
  const classSchedules = await timetableRepository.getTeacherSchedule(schoolId, teacherId);

  const conflicts: string[] = [];
  for (const entry of entries) {
    for (const tt of classSchedules) {
      if (tt.class === entry.class && tt.section === entry.section) continue;
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

    await syncClassTimetables(
      ctx.schoolId, existing.teacherId, existing.teacherName, existing.academicYear,
      existing.entries, tt.entries, ctx.displayName,
    );

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
