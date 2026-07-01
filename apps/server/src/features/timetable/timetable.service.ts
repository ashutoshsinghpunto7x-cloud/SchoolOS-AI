import { periodSlotRepository, CreatePeriodSlotData } from './timetable.period.repository';
import { timetableRepository } from './timetable.repository';
import { substituteRepository } from './timetable.substitute.repository';
import { IPeriodSlot } from './timetable.period.model';
import { ITimetable, ITimetableEntry, TimetableStatus } from './timetable.model';
import { ITimetableSubstitute } from './timetable.substitute.model';
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
    return sub;
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
};
