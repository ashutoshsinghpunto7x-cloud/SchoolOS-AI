import { periodSlotRepository, CreatePeriodSlotData } from './timetable.period.repository';
import { timetableRepository } from './timetable.repository';
import { substituteRepository } from './timetable.substitute.repository';
import { IPeriodSlot } from './timetable.period.model';
import { ITimetable, ITimetableEntry, TimetableStatus } from './timetable.model';
import { ITimetableSubstitute } from './timetable.substitute.model';
import { loadSubstituteDay } from './substitute-day';
import { rankSubstitutes, classKey, SubstituteSuggestion } from './substitute-ranking';
import { classTeacherRepository } from '../classes/class-teacher.repository';
import { Teacher } from '../teachers/teacher.model';
import { teacherRepository } from '../teachers/teacher.repository';
import { userRepository } from '../users/user.repository';
import { notificationRepository } from '../notifications/notification.repository';
import { internalMessageRepository } from '../internal-messages/internal-message.repository';
import { teacherTimetableRepository } from '../teacher-timetable/teacher-timetable.repository';
import { staffAttendanceRepository } from '../staff-attendance/staff-attendance.repository';
import { schoolClassRepository } from '../school-classes/school-class.repository';
import {
  createPeriodSlotSchema, updatePeriodSlotSchema,
  createTimetableSchema, updateTimetableSchema,
  upsertEntrySchema, bulkUpdateEntriesSchema,
  updateTimetableStatusSchema,
  createSubstituteSchema, updateSubstituteSchema,
  listTimetablesSchema, listSubstitutesSchema,
  masterGridQuerySchema, masterGridCellSchema,
} from './timetable.validation';
import type { MasterGridResponse, MasterGridRow, MasterGridCell } from '@schoolos/types';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { logger } from '../../lib/logger';

export interface NeedsSubstituteEntry {
  class: string;
  section: string;
  slotId: string;
  subjectName: string;
  timetableId: string;
  dayOfWeek: number;
  date: string;
  originalTeacherId: string;
  originalTeacherName: string;
  absenceReason: 'leave' | 'absent';
  leaveRequestId?: string;
}

export type { SubstituteSuggestion };

/**
 * Auto-sync into each affected teacher's personal TeacherTimetable whenever a
 * class Timetable's entries change. Diffs old vs. new entries by (dayOfWeek,
 * slotId): a slot whose teacher was removed/changed gets pulled from the old
 * teacher's schedule; a slot with a teacher assigned (new or changed) gets
 * pushed/updated on the new teacher's schedule. Best-effort — sync failures
 * are logged but never block the class timetable save itself.
 */
async function syncTeacherTimetables(
  schoolId: string, klass: string, section: string, academicYear: string,
  oldEntries: ITimetableEntry[], newEntries: ITimetableEntry[], updatedBy: string,
): Promise<void> {
  const key = (e: { dayOfWeek: number; slotId: string }) => `${e.dayOfWeek}::${e.slotId}`;
  const oldByKey = new Map(oldEntries.map((e) => [key(e), e]));
  const newByKey = new Map(newEntries.map((e) => [key(e), e]));
  const allKeys = new Set([...oldByKey.keys(), ...newByKey.keys()]);

  for (const k of allKeys) {
    const before = oldByKey.get(k);
    const after = newByKey.get(k);
    if (before?.teacherId === after?.teacherId && before?.subjectName === after?.subjectName && before?.roomNumber === after?.roomNumber) continue;

    try {
      if (before?.teacherId && before.teacherId !== after?.teacherId) {
        await teacherTimetableRepository.removeEntryForTeacher(
          schoolId, before.teacherId, academicYear, before.dayOfWeek, before.slotId, updatedBy,
        );
      }
      if (after?.teacherId) {
        await teacherTimetableRepository.syncEntryFromClassTimetable({
          schoolId, teacherId: after.teacherId, teacherName: after.teacherName ?? '', academicYear,
          dayOfWeek: after.dayOfWeek, slotId: after.slotId, subjectName: after.subjectName,
          class: klass, section, roomNumber: after.roomNumber, updatedBy,
        });
      }
    } catch (err) {
      logger.error('[timetableService] Teacher timetable sync failed', { schoolId, teacherId: after?.teacherId ?? before?.teacherId, err });
    }
  }
}

export type SubstituteChange = 'assigned' | 'cancelled' | 'reassigned';

/**
 * Tells a substitute their cover duty is off. Only for a live duty that is
 * today or later, and never blocks the change that caused it.
 */
async function alertRemovedSubstitute(
  record: ITimetableSubstitute, change: 'cancelled' | 'reassigned', ctx: AuthContext,
): Promise<void> {
  if (record.status !== 'active' || !record.substituteTeacherId) return;
  const date = new Date(record.date).toISOString().slice(0, 10);
  if (date < staffAttendanceRepository.todayString()) return;

  try {
    await timetableService.notifySubstituteTeacher({
      substituteTeacherId: record.substituteTeacherId, class: record.class, section: record.section,
      date, slotId: record.slotId, subjectName: record.subjectName,
    }, ctx, change);
  } catch (err) {
    logger.error('[timetableService] Substitute removal alert failed', {
      schoolId: ctx.schoolId, substituteId: String(record._id), err,
    });
  }
}

export const timetableService = {
  // ── Period Slots ────────────────────────────────────────────────────────────

  async listPeriodSlots(ctx: AuthContext): Promise<IPeriodSlot[]> {
    return periodSlotRepository.findAll(ctx.schoolId);
  },

  async createPeriodSlot(rawInput: unknown, ctx: AuthContext): Promise<IPeriodSlot> {
    const data = createPeriodSlotSchema.parse(rawInput);
    const slotData: CreatePeriodSlotData = { ...data, schoolId: ctx.schoolId, createdBy: ctx.displayName };
    const slot = await periodSlotRepository.create(slotData);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.period_created', resource: 'period_slots',
      resourceId: slot._id.toString(), ip: ctx.ip, schoolId: ctx.schoolId,
      details: { name: slot.name },
    });
    return slot;
  },

  async updatePeriodSlot(id: string, rawInput: unknown, ctx: AuthContext): Promise<IPeriodSlot> {
    const data = updatePeriodSlotSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');
    const slot = await periodSlotRepository.update(id, ctx.schoolId, { ...data, updatedBy: ctx.displayName });
    if (!slot) throw new NotFoundError('Period slot');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.period_updated', resource: 'period_slots',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });
    return slot;
  },

  async deletePeriodSlot(id: string, ctx: AuthContext): Promise<void> {
    const slot = await periodSlotRepository.findById(id, ctx.schoolId);
    if (!slot) throw new NotFoundError('Period slot');
    await periodSlotRepository.softDelete(id, ctx.schoolId, ctx.displayName);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.period_deleted', resource: 'period_slots',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async reorderPeriodSlots(orderedIds: string[], ctx: AuthContext): Promise<void> {
    await periodSlotRepository.reorder(ctx.schoolId, orderedIds);
  },

  // ── Timetables ──────────────────────────────────────────────────────────────

  async createTimetable(rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const data = createTimetableSchema.parse(rawInput);
    const timetable = await timetableRepository.create({
      ...data, schoolId: ctx.schoolId, createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.created', resource: 'timetables',
      resourceId: timetable._id.toString(), ip: ctx.ip, schoolId: ctx.schoolId,
      details: { class: data.class, section: data.section, academicYear: data.academicYear },
    });
    return timetable;
  },

  async listTimetables(rawQuery: unknown, ctx: AuthContext) {
    const opts = listTimetablesSchema.parse(rawQuery);
    return timetableRepository.findAll(ctx.schoolId, opts);
  },

  async getTimetable(id: string, ctx: AuthContext): Promise<ITimetable> {
    const tt = await timetableRepository.findById(id, ctx.schoolId);
    if (!tt) throw new NotFoundError('Timetable');
    return tt;
  },

  async updateTimetable(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const data = updateTimetableSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');
    const tt = await timetableRepository.update(id, ctx.schoolId, { ...data, updatedBy: ctx.displayName });
    if (!tt) throw new NotFoundError('Timetable');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.updated', resource: 'timetables',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });
    return tt;
  },

  async upsertEntry(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const entry = upsertEntrySchema.parse(rawInput) as ITimetableEntry;
    const existing = await timetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Timetable');

    // Conflict detection
    const conflicts: string[] = [];
    if (entry.teacherId) {
      const clash = await timetableRepository.findConflictingTeacher(
        ctx.schoolId, id, entry.dayOfWeek, entry.slotId, entry.teacherId,
      );
      if (clash) conflicts.push(`Teacher ${entry.teacherName ?? entry.teacherId} is already assigned to Class ${clash.class}-${clash.section} at this slot`);
    }
    if (entry.roomNumber) {
      const clash = await timetableRepository.findConflictingRoom(
        ctx.schoolId, id, entry.dayOfWeek, entry.slotId, entry.roomNumber,
      );
      if (clash) conflicts.push(`Room ${entry.roomNumber} is already assigned to Class ${clash.class}-${clash.section} at this slot`);
    }
    if (conflicts.length) throw new ValidationError(conflicts.join('; '));

    const tt = await timetableRepository.upsertEntry(id, ctx.schoolId, { ...entry, updatedBy: ctx.displayName });
    if (!tt) throw new NotFoundError('Timetable');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.entry_updated', resource: 'timetables',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
      details: { dayOfWeek: entry.dayOfWeek, slotId: entry.slotId, subjectName: entry.subjectName },
    });

    await syncTeacherTimetables(ctx.schoolId, tt.class, tt.section, tt.academicYear, existing.entries, tt.entries, ctx.displayName);

    return tt;
  },

  async removeEntry(id: string, dayOfWeek: number, slotId: string, ctx: AuthContext): Promise<ITimetable> {
    const existing = await timetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Timetable');
    const tt = await timetableRepository.removeEntry(id, ctx.schoolId, dayOfWeek, slotId, ctx.displayName);
    if (!tt) throw new NotFoundError('Timetable');

    await syncTeacherTimetables(ctx.schoolId, tt.class, tt.section, tt.academicYear, existing.entries, tt.entries, ctx.displayName);

    return tt;
  },

  async bulkUpdateEntries(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const { entries } = bulkUpdateEntriesSchema.parse(rawInput);
    const existing = await timetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Timetable');
    const tt = await timetableRepository.bulkUpdateEntries(id, ctx.schoolId, entries as ITimetableEntry[], ctx.displayName);
    if (!tt) throw new NotFoundError('Timetable');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.entries_bulk_updated', resource: 'timetables',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
      details: { entryCount: entries.length },
    });

    await syncTeacherTimetables(ctx.schoolId, tt.class, tt.section, tt.academicYear, existing.entries, tt.entries, ctx.displayName);

    return tt;
  },

  async updateStatus(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const { status } = updateTimetableStatusSchema.parse(rawInput);
    const existing = await timetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Timetable');

    const extra: Record<string, unknown> = {};
    if (status === 'published') { extra.publishedAt = new Date(); extra.publishedBy = ctx.displayName; }
    if (status === 'archived')  { extra.archivedAt  = new Date(); extra.archivedBy  = ctx.displayName; }

    const tt = await timetableRepository.updateStatus(id, ctx.schoolId, status as TimetableStatus, ctx.displayName, extra);
    if (!tt) throw new NotFoundError('Timetable');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: status === 'published' ? 'timetable.published' : status === 'archived' ? 'timetable.archived' : 'timetable.updated',
      resource: 'timetables', resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
      details: { from: existing.status, to: status },
    });
    return tt;
  },

  async deleteTimetable(id: string, ctx: AuthContext): Promise<void> {
    const existing = await timetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Timetable');
    await timetableRepository.softDelete(id, ctx.schoolId, ctx.displayName);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.deleted', resource: 'timetables',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async getTeacherSchedule(teacherId: string, ctx: AuthContext) {
    return timetableRepository.getTeacherSchedule(ctx.schoolId, teacherId);
  },

  async detectConflicts(ctx: AuthContext) {
    return timetableRepository.detectAllConflicts(ctx.schoolId);
  },

  // ── Master (whole-school) Timetable Grid ───────────────────────────────────
  // One page, every class×section as a row, every period as a column — the
  // digital equivalent of the paper master timetable on the staff room wall.
  // Reads/writes the same Timetable documents the per-class grid uses, so
  // there's no separate dataset to drift out of sync.

  /**
   * "Master" is day-agnostic: each cell shows one fixed weekly pattern rather
   * than a per-day schedule. Since writes (see setMasterGridCell) always fan
   * an entry out across every day a period applies to, all of a slot's day
   * entries should already agree — picking the earliest weekday is just a
   * defensive tie-break if they were ever edited out of band (e.g. directly
   * through the per-class grid on only one day).
   */
  async getMasterGrid(rawQuery: unknown, ctx: AuthContext): Promise<MasterGridResponse> {
    const { academicYear, term } = masterGridQuerySchema.parse(rawQuery);

    const [periods, classes, timetables] = await Promise.all([
      periodSlotRepository.findAll(ctx.schoolId),
      schoolClassRepository.findAll(ctx.schoolId),
      timetableRepository.findAllActiveForYear(ctx.schoolId, academicYear, term),
    ]);

    const orderedPeriods = [...periods].sort((a, b) => a.orderIndex - b.orderIndex);
    const timetableByKey = new Map(timetables.map((tt) => [`${tt.class}||${tt.section}`, tt]));

    const rows: MasterGridRow[] = [];
    for (const cls of classes) {
      for (const section of cls.sections) {
        const tt = timetableByKey.get(`${cls.name}||${section}`);
        const cells: Record<string, MasterGridCell | null> = {};

        for (const slot of orderedPeriods) {
          const slotId = String(slot._id);
          if (slot.isBreak) { cells[slotId] = null; continue; }

          const dayEntries = (tt?.entries ?? [])
            .filter((e) => e.slotId === slotId)
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
          const chosen = dayEntries[0];
          cells[slotId] = chosen
            ? { subjectName: chosen.subjectName, teacherId: chosen.teacherId, teacherName: chosen.teacherName, roomNumber: chosen.roomNumber }
            : null;
        }

        rows.push({ class: cls.name, section, timetableId: tt ? tt._id.toString() : undefined, cells });
      }
    }

    // Mongoose's lean IPeriodSlot (ObjectId/Date fields) vs. the shared
    // PeriodSlot type (string fields) only differ pre-serialization — the
    // JSON response sendSuccess writes matches the shared type at runtime.
    return { periods: orderedPeriods as unknown as MasterGridResponse['periods'], rows, academicYear, term };
  },

  /**
   * Writes one master-grid cell through to the underlying per-class Timetable,
   * fanning it out across every weekday the period slot applies to (so the
   * grid stays a single fixed pattern, not six independent day schedules).
   * Delegates each day's write to upsertEntry/removeEntry so conflict
   * detection, audit logging, and the teacher-timetable sync all fire exactly
   * as they would from the per-class grid.
   */
  async setMasterGridCell(rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const data = masterGridCellSchema.parse(rawInput);

    let tt = await timetableRepository.findByClassSection(ctx.schoolId, data.class, data.section, data.academicYear);
    if (!tt) {
      tt = await timetableRepository.create({
        schoolId: ctx.schoolId, class: data.class, section: data.section,
        academicYear: data.academicYear, term: data.term, createdBy: ctx.displayName,
      });
    }
    const ttId = tt._id.toString();

    const slot = await periodSlotRepository.findById(data.slotId, ctx.schoolId);
    if (!slot) throw new NotFoundError('Period slot');

    const subjectName = data.subjectName?.trim();
    let result = tt;
    for (const day of slot.daysApplicable) {
      result = subjectName
        ? await timetableService.upsertEntry(ttId, {
            dayOfWeek: day, slotId: data.slotId, subjectName,
            teacherId: data.teacherId, teacherName: data.teacherName, roomNumber: data.roomNumber,
          }, ctx)
        : await timetableService.removeEntry(ttId, day, data.slotId, ctx);
    }
    return result;
  },

  // ── Substitutes ─────────────────────────────────────────────────────────────

  async createSubstitute(rawInput: unknown, ctx: AuthContext): Promise<ITimetableSubstitute> {
    const data = createSubstituteSchema.parse(rawInput);
    const tt = await timetableRepository.findById(data.timetableId, ctx.schoolId);
    if (!tt) throw new NotFoundError('Timetable');

    const { substitutes: sameDay } = await substituteRepository.findAll(ctx.schoolId, {
      dateFrom: data.date, dateTo: data.date, limit: 100,
    });
    const isSamePeriod = (s: ITimetableSubstitute) =>
      s.slotId === data.slotId && classKey(s.class, s.section) === classKey(data.class, data.section);

    const clash = sameDay.find((s) =>
      s.status === 'active' && !!data.substituteTeacherId &&
      s.substituteTeacherId === data.substituteTeacherId && s.slotId === data.slotId && !isSamePeriod(s));
    if (clash) {
      throw new ValidationError(
        `${data.substituteTeacherName} is already covering Class ${clash.class}-${clash.section} in this period`,
      );
    }

    const sub = await substituteRepository.create({
      ...data, date: new Date(data.date), schoolId: ctx.schoolId, createdBy: ctx.displayName,
    });

    // Reassigning a period replaces the earlier record, so one period never has two substitutes.
    await Promise.all(sameDay.filter(isSamePeriod).map(async (s) => {
      await substituteRepository.softDelete(String(s._id), ctx.schoolId, ctx.displayName);
      if (s.substituteTeacherId !== data.substituteTeacherId) await alertRemovedSubstitute(s, 'reassigned', ctx);
    }));

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.substitute_assigned', resource: 'timetable_substitutes',
      resourceId: sub._id.toString(), ip: ctx.ip, schoolId: ctx.schoolId,
      details: { class: data.class, section: data.section, date: data.date, substituteTeacherName: data.substituteTeacherName },
    });

    // The assignment stands even if the alert fails; the principal is told either way.
    let teacherNotified = false;
    try {
      teacherNotified = await timetableService.notifySubstituteTeacher(data, ctx);
    } catch (err) {
      logger.error('[timetableService] Substitute alert failed', { schoolId: ctx.schoolId, substituteId: String(sub._id), err });
    }

    const saved = await substituteRepository.update(String(sub._id), ctx.schoolId, { teacherNotified });
    return saved ?? sub;
  },

  /**
   * High-priority alert to a substitute whose duty was assigned, cancelled or
   * given to someone else: it blocks their dashboard until acknowledged, and
   * also appears in their notification bell. Returns false when the teacher has
   * no app login to send it to.
   */
  async notifySubstituteTeacher(
    data: {
      substituteTeacherId?: string; originalTeacherName?: string;
      class: string; section: string; date: string; slotId: string; subjectName: string;
    },
    ctx: AuthContext,
    change: SubstituteChange = 'assigned',
  ): Promise<boolean> {
    if (!data.substituteTeacherId) return false;

    const teacher = await teacherRepository.findById(data.substituteTeacherId, ctx.schoolId);
    if (!teacher) return false;

    // The admin-issued login email and the contact email can differ, and either may be the account.
    let recipientUserId: string | undefined;
    for (const email of [teacher.loginEmail, teacher.email]) {
      if (!email) continue;
      const user = await userRepository.findByEmail(email);
      if (user && user.schoolId === ctx.schoolId && user.role === 'teacher') {
        recipientUserId = String(user._id);
        break;
      }
    }
    if (!recipientUserId) return false;

    const slot = await periodSlotRepository.findById(data.slotId, ctx.schoolId);
    const period = slot ? `${slot.name} (${slot.startTime}–${slot.endTime})` : 'one period';
    const dateLabel = new Date(data.date + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const heading = {
      assigned: 'Substitution', cancelled: 'Substitution cancelled', reassigned: 'Substitution reassigned',
    }[change];
    const subject = `${heading}: Class ${data.class}-${data.section}, ${slot?.name ?? dateLabel}`;
    const duty = `${data.subjectName} for Class ${data.class}-${data.section} on ${dateLabel}, ${period}`;
    const body = {
      assigned: `You have been assigned to cover ${duty}` +
        `${data.originalTeacherName ? `, in place of ${data.originalTeacherName}` : ''}.`,
      cancelled: `Your substitution to cover ${duty}, has been cancelled. You do not need to take this class.`,
      reassigned: `Your substitution to cover ${duty}, has been given to another teacher. ` +
        'You do not need to take this class.',
    }[change];

    await Promise.all([
      notificationRepository.create({
        recipientUserId,
        schoolId: ctx.schoolId,
        type: 'substitution',
        title: subject,
        body,
        priority: 'high',
        payload: { class: data.class, section: data.section, date: data.date, slotId: data.slotId, change },
        senderUserId: ctx.userId,
        senderName: ctx.displayName,
      }),
      internalMessageRepository.create({
        schoolId: ctx.schoolId,
        senderUserId: ctx.userId,
        senderName: ctx.displayName,
        recipientUserId,
        subject,
        body,
        priority: 'high',
      }),
    ]);
    return true;
  },

  async listSubstitutes(rawQuery: unknown, ctx: AuthContext) {
    const opts = listSubstitutesSchema.parse(rawQuery);
    return substituteRepository.findAll(ctx.schoolId, opts);
  },

  async updateSubstitute(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITimetableSubstitute> {
    const data = updateSubstituteSchema.parse(rawInput);
    const existing = await substituteRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Substitute');
    const sub = await substituteRepository.update(id, ctx.schoolId, { ...data, updatedBy: ctx.displayName });
    if (!sub) throw new NotFoundError('Substitute');

    if (data.status === 'cancelled') {
      await alertRemovedSubstitute(existing, 'cancelled', ctx);
    } else if (data.substituteTeacherId !== undefined && data.substituteTeacherId !== existing.substituteTeacherId) {
      await alertRemovedSubstitute(existing, 'reassigned', ctx);
    }
    return sub;
  },

  async deleteSubstitute(id: string, ctx: AuthContext): Promise<void> {
    const existing = await substituteRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Substitute');
    await substituteRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    await alertRemovedSubstitute(existing, 'cancelled', ctx);
  },

  /**
   * Periods that need a substitute on a given date: every period taught by a
   * teacher who is on approved leave or marked absent, minus any that have an
   * active substitute (a cancelled one puts the period back on the list).
   * Derived live — nothing is written until the principal assigns someone.
   */
  async getNeedsSubstitute(schoolId: string, date: string): Promise<NeedsSubstituteEntry[]> {
    if (new Date(date + 'T00:00:00').getDay() === 0) return []; // no school on Sunday — entries only exist for days 1-6

    const day = await loadSubstituteDay(schoolId, date);
    if (!day.absent.size) return [];

    const covered = new Set(
      day.substitutes.filter((s) => s.status === 'active').map((s) => `${classKey(s.class, s.section)}||${s.slotId}`),
    );

    const needed: NeedsSubstituteEntry[] = [];
    for (const period of day.periods) {
      const teacher = day.absent.get(period.teacherId);
      if (!teacher || covered.has(`${classKey(period.class, period.section)}||${period.slotId}`)) continue;
      needed.push({
        class: period.class,
        section: period.section,
        slotId: period.slotId,
        subjectName: period.subjectName,
        timetableId: period.timetableId,
        dayOfWeek: day.dayOfWeek,
        date,
        originalTeacherId: teacher.teacherId,
        originalTeacherName: teacher.teacherName,
        absenceReason: teacher.reason,
        leaveRequestId: teacher.leaveRequestId,
      });
    }
    return needed;
  },

  /**
   * Ranked substitute candidates for one period (see rankSubstitutes for the
   * order). Absent teachers, and teachers already busy in that period, are
   * left out.
   */
  async suggestSubstituteTeachers(
    schoolId: string, cls: string, section: string,
    opts: { date: string; slotId?: string; excludeTeacherId?: string },
  ): Promise<SubstituteSuggestion[]> {
    const [day, activeTeachers, periodSlots, classTimetable, assignments] = await Promise.all([
      loadSubstituteDay(schoolId, opts.date),
      Teacher.find({ schoolId, isDeleted: false, employmentStatus: 'active' })
        .select('_id fullName assignedClasses').lean(),
      periodSlotRepository.findAll(schoolId),
      timetableRepository.findByClassSectionAnyYear(schoolId, cls, section),
      classTeacherRepository.findAll(schoolId),
    ]);

    const target = classKey(cls, section);
    const classTeacherIds = new Set<string>([
      ...(classTimetable?.entries ?? []).map((e) => e.teacherId).filter((id): id is string => !!id),
      ...day.periods.filter((p) => classKey(p.class, p.section) === target).map((p) => p.teacherId),
      ...assignments.filter((a) => classKey(a.class, a.section) === target).map((a) => a.teacherId),
      ...activeTeachers
        .filter((t) => (t.assignedClasses ?? []).some((c) => classKey(c) === target))
        .map((t) => String(t._id)),
    ]);

    return rankSubstitutes({
      teachers: activeTeachers.map((t) => ({ teacherId: String(t._id), teacherName: t.fullName })),
      classTeacherIds,
      busySlots: day.busySlots,
      absentIds: new Set(day.absent.keys()),
      daySlotIds: periodSlots
        .filter((slot) => !slot.isBreak && slot.daysApplicable.includes(day.dayOfWeek))
        .map((slot) => String(slot._id)),
      slotId: opts.slotId,
      excludeTeacherId: opts.excludeTeacherId,
    });
  },
};
