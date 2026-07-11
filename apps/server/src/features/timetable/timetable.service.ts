import { periodSlotRepository, CreatePeriodSlotData } from './timetable.period.repository';
import { timetableRepository } from './timetable.repository';
import { substituteRepository } from './timetable.substitute.repository';
import { IPeriodSlot } from './timetable.period.model';
import { ITimetable, ITimetableEntry, TimetableStatus } from './timetable.model';
import { ITimetableSubstitute } from './timetable.substitute.model';
import { leaveRequestRepository } from '../leave-requests/leave-request.repository';
import { Teacher } from '../teachers/teacher.model';
import { teacherRepository } from '../teachers/teacher.repository';
import { userRepository } from '../users/user.repository';
import { notificationRepository } from '../notifications/notification.repository';
import { internalMessageRepository } from '../internal-messages/internal-message.repository';
import {
  createPeriodSlotSchema, updatePeriodSlotSchema,
  createTimetableSchema, updateTimetableSchema,
  upsertEntrySchema, bulkUpdateEntriesSchema,
  updateTimetableStatusSchema,
  createSubstituteSchema, updateSubstituteSchema,
  listTimetablesSchema, listSubstitutesSchema,
} from './timetable.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

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
  leaveRequestId: string;
}

export interface SubstituteSuggestion {
  teacherId: string;
  teacherName: string;
  teachesThisClass: boolean;
  freePeriodsToday: number;
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
    return tt;
  },

  async removeEntry(id: string, dayOfWeek: number, slotId: string, ctx: AuthContext): Promise<ITimetable> {
    const existing = await timetableRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Timetable');
    const tt = await timetableRepository.removeEntry(id, ctx.schoolId, dayOfWeek, slotId, ctx.displayName);
    if (!tt) throw new NotFoundError('Timetable');
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

  // ── Substitutes ─────────────────────────────────────────────────────────────

  async createSubstitute(rawInput: unknown, ctx: AuthContext): Promise<ITimetableSubstitute> {
    const data = createSubstituteSchema.parse(rawInput);
    const tt = await timetableRepository.findById(data.timetableId, ctx.schoolId);
    if (!tt) throw new NotFoundError('Timetable');

    const sub = await substituteRepository.create({
      ...data, date: new Date(data.date), schoolId: ctx.schoolId, createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'timetable.substitute_assigned', resource: 'timetable_substitutes',
      resourceId: sub._id.toString(), ip: ctx.ip, schoolId: ctx.schoolId,
      details: { class: data.class, section: data.section, date: data.date, substituteTeacherName: data.substituteTeacherName },
    });

    await timetableService.notifySubstituteTeacher(data, ctx);

    return sub;
  },

  /**
   * Best-effort alert to whoever just got assigned a substitution — resolved via the
   * same Teacher.email → User match convention notificationService.sendToTeachers()
   * relies on. Always fired at high priority: a substitution is same-day, time-sensitive
   * work a teacher needs to notice immediately, not something that can wait in a queue.
   * Silently skipped (no error thrown) if the substitute has no linked login account,
   * since the assignment itself must not fail because a notification couldn't be sent.
   */
  async notifySubstituteTeacher(
    data: { substituteTeacherId?: string; class: string; section: string; date: string; subjectName: string },
    ctx: AuthContext,
  ): Promise<void> {
    if (!data.substituteTeacherId) return;

    const teacher = await teacherRepository.findById(data.substituteTeacherId, ctx.schoolId);
    if (!teacher?.email) return;

    const user = await userRepository.findByEmail(teacher.email);
    if (!user || user.schoolId !== ctx.schoolId || user.role !== 'teacher') return;

    const dateLabel = new Date(data.date + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const subject = `Substitution assigned — Class ${data.class}-${data.section} on ${dateLabel}`;
    const body = `You've been assigned to cover ${data.subjectName} for Class ${data.class}-${data.section} on ${dateLabel}.`;
    const recipientUserId = String(user._id);

    await Promise.all([
      notificationRepository.create({
        recipientUserId,
        schoolId: ctx.schoolId,
        type: 'substitution',
        title: subject,
        body,
        priority: 'high',
        payload: { class: data.class, section: data.section, date: data.date },
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
  },

  async listSubstitutes(rawQuery: unknown, ctx: AuthContext) {
    const opts = listSubstitutesSchema.parse(rawQuery);
    return substituteRepository.findAll(ctx.schoolId, opts);
  },

  async updateSubstitute(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITimetableSubstitute> {
    const data = updateSubstituteSchema.parse(rawInput);
    const sub = await substituteRepository.update(id, ctx.schoolId, { ...data, updatedBy: ctx.displayName });
    if (!sub) throw new NotFoundError('Substitute');
    return sub;
  },

  async deleteSubstitute(id: string, ctx: AuthContext): Promise<void> {
    const existing = await substituteRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Substitute');
    await substituteRepository.softDelete(id, ctx.schoolId, ctx.displayName);
  },

  /**
   * Periods that need a substitute on a given date: every period an on-leave
   * teacher was scheduled to teach, minus any that already have an active
   * substitute assigned. This is what auto-links Leave Approval to the
   * Substitutions tab — no substitute record is written until the principal
   * actually assigns someone (the schema requires a substitute name), so this
   * is derived live from approved leave + the published timetable instead.
   */
  async getNeedsSubstitute(schoolId: string, date: string): Promise<NeedsSubstituteEntry[]> {
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    if (dayOfWeek === 0) return []; // no school on Sunday — entries only exist for days 1-6

    const approvedLeaves = await leaveRequestRepository.findApprovedForDate(schoolId, date);
    if (!approvedLeaves.length) return [];

    const existingSubs = await substituteRepository.findAll(schoolId, { dateFrom: date, dateTo: date, limit: 200 });
    const covered = new Set(existingSubs.substitutes.map((s) => `${s.class}||${s.section}||${s.slotId}`));

    const needed: NeedsSubstituteEntry[] = [];
    for (const leave of approvedLeaves) {
      const timetables = await timetableRepository.getTeacherSchedule(schoolId, leave.teacherId);
      for (const tt of timetables) {
        for (const entry of tt.entries) {
          if (entry.teacherId !== leave.teacherId || entry.dayOfWeek !== dayOfWeek) continue;
          const key = `${tt.class}||${tt.section}||${entry.slotId}`;
          if (covered.has(key)) continue;
          needed.push({
            class: tt.class,
            section: tt.section,
            slotId: entry.slotId,
            subjectName: entry.subjectName,
            timetableId: String((tt as unknown as { _id: { toString(): string } })._id),
            dayOfWeek,
            date,
            originalTeacherId: leave.teacherId,
            originalTeacherName: leave.teacherName,
            leaveRequestId: String((leave as unknown as { _id: { toString(): string } })._id),
          });
        }
      }
    }
    return needed;
  },

  /**
   * Substitute picker priority: teachers already teaching this class/section first, then the rest of
   * the active roster. Also surfaces each candidate's free periods on the given weekday (falls back to
   * today if not supplied) so the principal can see at a glance who actually has room to cover a period.
   */
  async suggestSubstituteTeachers(
    schoolId: string, cls: string, section: string, excludeTeacherId?: string, dayOfWeek?: number,
  ): Promise<SubstituteSuggestion[]> {
    const effectiveDay = dayOfWeek ?? new Date().getDay();

    const [classTimetable, activeTeachers, periodSlots, scheduledCounts] = await Promise.all([
      timetableRepository.findByClassSectionAnyYear(schoolId, cls, section),
      Teacher.find({ schoolId, isDeleted: false, employmentStatus: 'active' }).select('_id fullName').lean(),
      periodSlotRepository.findAll(schoolId),
      timetableRepository.countScheduledPeriodsByTeacher(schoolId, effectiveDay),
    ]);

    const totalPeriodsToday = periodSlots.filter(
      (slot) => !slot.isBreak && slot.daysApplicable.includes(effectiveDay),
    ).length;

    const teachesClass = new Set(
      (classTimetable?.entries ?? []).map((e) => e.teacherId).filter((id): id is string => !!id),
    );

    const suggestions: SubstituteSuggestion[] = activeTeachers
      .map((t) => {
        const teacherId = String((t as unknown as { _id: { toString(): string } })._id);
        const scheduled = scheduledCounts.get(teacherId) ?? 0;
        return {
          teacherId,
          teacherName: t.fullName,
          teachesThisClass: teachesClass.has(teacherId),
          freePeriodsToday: Math.max(0, totalPeriodsToday - scheduled),
        };
      })
      .filter((t) => t.teacherId !== excludeTeacherId);

    // Most free periods first (within each teaches-this-class tier) — the
    // whole point is to make it easy to pick someone who actually has room.
    suggestions.sort((a, b) => {
      if (a.teachesThisClass !== b.teachesThisClass) return a.teachesThisClass ? -1 : 1;
      if (a.freePeriodsToday !== b.freePeriodsToday) return b.freePeriodsToday - a.freePeriodsToday;
      return a.teacherName.localeCompare(b.teacherName);
    });

    return suggestions;
  },
};
