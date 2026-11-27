import { z } from 'zod';
import { ActionDefinition, ActionPreview, ActionResultSummary } from '../action-registry';
import { AuthContext } from '../../../lib/auth-context';
import { PERMISSIONS } from '../../../lib/permissions';
import { classNameVariants } from '../../../lib/class-name';
import { ValidationError } from '../../../middlewares/errorHandler';
import { escapeRegex } from '../query-params';
import { attendanceRepository } from '../../attendance/attendance.repository';
import { timetableService, NeedsSubstituteEntry } from '../../timetable/timetable.service';
import { periodSlotRepository } from '../../timetable/timetable.period.repository';
import { Teacher } from '../../teachers/teacher.model';
import { SchoolEvent } from '../../events/event.model';
import { eventService } from '../../events/event.service';
import { FeeRecord } from '../../fees/fee.model';
import { User } from '../../users/user.model';
import { notificationService } from '../../notifications/notification.service';

// ── Operations actions: substitute assignment, event edit/cancel, fee reminders ──
// Same contract as office.actions.ts — previews never mutate; execute re-resolves
// everything server-side and calls the real feature service.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const todayISO = () => attendanceRepository.todayString();
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ── 1. Assign a substitute teacher to an uncovered period ────────────────────

const substituteSchema = z.object({
  substituteName: z.string().trim().max(120).default(''),
  className: z.string().trim().max(20).default(''),
  section: z.string().trim().max(5).default(''),
  period: z.number().int().min(0).max(20).default(0),
  date: z.string().regex(DATE_REGEX).default(todayISO),
});
type SubstituteParams = z.infer<typeof substituteSchema>;

async function resolveSubstitute(ctx: AuthContext, p: SubstituteParams) {
  const [needed, slots, teachers] = await Promise.all([
    timetableService.getNeedsSubstitute(ctx.schoolId, p.date),
    periodSlotRepository.findAll(ctx.schoolId),
    p.substituteName
      ? Teacher.find({ schoolId: ctx.schoolId, isDeleted: false, employmentStatus: 'active', fullName: new RegExp(escapeRegex(p.substituteName), 'i') })
          .select('fullName').limit(5).lean<{ _id: unknown; fullName: string }[]>()
      : Promise.resolve([] as { _id: unknown; fullName: string }[]),
  ]);
  const slotName = new Map(slots.map((s) => [String(s._id), s]));
  const classes = p.className ? new Set(classNameVariants(p.className).map((c) => c.toLowerCase())) : null;
  const periods = needed.filter((n) => {
    if (classes && !classes.has(n.class.toLowerCase())) return false;
    if (p.section && n.section.toUpperCase() !== p.section.toUpperCase()) return false;
    if (p.period && slotName.get(n.slotId)?.orderIndex !== p.period) return false;
    return true;
  });
  return { periods, teachers, slotName };
}

export const assignSubstituteAction: ActionDefinition<SubstituteParams, Awaited<ReturnType<typeof resolveSubstitute>>, { summary: string }> = {
  id: 'ASSIGN_SUBSTITUTE',
  description: 'Assign a teacher to cover a period that has no teacher (because of leave/absence) — "assign Rahul sir to class 6A period 3", "6A ke period 2 mein Mrs Gupta ko substitute lagao".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: substituteSchema,
  paramsShapeDescription: `
Fields:
- substituteName (string): the teacher who will COVER the period, name only.
- className (string, grade only like "6") and section (letter): the class that needs cover.
- period (integer): the period number, 0 if not stated.
- date (YYYY-MM-DD): the day; today if not stated.`.trim(),
  async buildPreview(ctx, params) { return resolveSubstitute(ctx, params); },
  describePreview(preview, params): ActionPreview {
    const warnings: string[] = [];
    if (!params.substituteName) warnings.push('Tell me which teacher should cover.');
    else if (!preview.teachers.length) warnings.push(`No active teacher matching "${params.substituteName}" was found.`);
    else if (preview.teachers.length > 1) warnings.push(`Several teachers match: ${preview.teachers.map((t) => t.fullName).join(', ')}. Use the full name.`);
    if (!preview.periods.length) warnings.push('No uncovered period matches. Nothing needs a substitute for those details.');
    else if (preview.periods.length > 1) warnings.push(`${preview.periods.length} uncovered periods match — add the class, section and period number.`);
    const one = preview.periods.length === 1 ? preview.periods[0] : null;
    return {
      title: 'Assign substitute',
      fields: [
        { key: 'substituteName', label: 'Substitute teacher', value: preview.teachers.length === 1 ? preview.teachers[0].fullName : params.substituteName, type: 'text', editable: true },
        { key: 'className', label: 'Class', value: one?.class ?? params.className, type: 'text', editable: true },
        { key: 'section', label: 'Section', value: one?.section ?? params.section, type: 'text', editable: true },
        { key: 'period', label: 'Period', value: one ? (preview.slotName.get(one.slotId)?.name ?? '') : (params.period || ''), type: 'text', editable: true },
        { key: 'date', label: 'Date', value: params.date, type: 'text', editable: true },
        ...(one ? [{ key: 'for', label: 'Covering for', value: `${one.originalTeacherName} (${one.subjectName})`, type: 'text' as const, editable: false }] : []),
      ],
      warnings: warnings.length ? warnings : undefined,
    };
  },
  async execute(ctx, params) {
    const { periods, teachers, slotName } = await resolveSubstitute(ctx, params);
    if (teachers.length !== 1) throw new ValidationError(teachers.length ? 'More than one teacher matches — use the full name.' : 'No active teacher with that name was found.');
    if (periods.length !== 1) throw new ValidationError(periods.length ? 'More than one uncovered period matches — add the class and period.' : 'No uncovered period matches.');
    const n: NeedsSubstituteEntry = periods[0];
    const t = teachers[0];
    // createSubstitute rejects a substitute who is already busy in that period and alerts the teacher.
    await timetableService.createSubstitute({
      timetableId: n.timetableId, class: n.class, section: n.section, date: n.date, dayOfWeek: n.dayOfWeek,
      slotId: n.slotId, subjectName: n.subjectName,
      originalTeacherId: n.originalTeacherId, originalTeacherName: n.originalTeacherName,
      substituteTeacherId: String(t._id), substituteTeacherName: t.fullName,
      reason: n.absenceReason === 'leave' ? 'On leave' : 'Absent',
    }, ctx);
    return { summary: `${t.fullName} will cover Class ${n.class}-${n.section}, ${slotName.get(n.slotId)?.name ?? 'the period'} on ${n.date} (for ${n.originalTeacherName}). They have been alerted.` };
  },
  describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
};

// ── 2. Reschedule or cancel an event ─────────────────────────────────────────

const editEventSchema = z.object({
  titleQuery: z.string().trim().max(200).default(''),
  operation: z.enum(['reschedule', 'cancel']).default('reschedule'),
  newDate: z.string().regex(DATE_REGEX).optional(),
  newTime: z.string().regex(TIME_REGEX).optional(),
});
type EditEventParams = z.infer<typeof editEventSchema>;
interface EventHit { _id: unknown; title: string; eventType: string; startDate: Date; endDate: Date; startTime?: string; status: string }

async function findEvents(ctx: AuthContext, q: string): Promise<EventHit[]> {
  if (!q) return [];
  return SchoolEvent.find({
    schoolId: ctx.schoolId, isDeleted: false, status: { $in: ['draft', 'scheduled', 'published'] },
    endDate: { $gte: new Date(`${todayISO()}T00:00:00`) }, title: new RegExp(escapeRegex(q), 'i'),
  }).sort({ startDate: 1 }).limit(6).select('title eventType startDate endDate startTime status').lean<EventHit[]>();
}
const day = (d: Date) => d.toISOString().slice(0, 10);

export const editEventAction: ActionDefinition<EditEventParams, { matches: EventHit[] }, { summary: string }> = {
  id: 'EDIT_EVENT',
  description: 'Reschedule (new date/time) or cancel an EXISTING event, holiday or PTM — "move the PTM to 12 December", "cancel the sports day", "annual function ko 20 tarikh par karo".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: editEventSchema,
  paramsShapeDescription: `
Fields:
- titleQuery (string): words from the existing event's title, e.g. "PTM" or "sports day".
- operation ("reschedule" | "cancel").
- newDate (YYYY-MM-DD): the new date, only for reschedule; null if not stated.
- newTime (HH:MM, 24-hour): the new start time, only if stated.`.trim(),
  async buildPreview(ctx, params) { return { matches: await findEvents(ctx, params.titleQuery) }; },
  describePreview(preview, params): ActionPreview {
    const m = preview.matches;
    const warnings: string[] = [];
    if (!params.titleQuery) warnings.push('Tell me which event.');
    else if (!m.length) warnings.push(`No upcoming event matching "${params.titleQuery}" was found.`);
    else if (m.length > 1) warnings.push(`${m.length} events match: ${m.map((e) => `${e.title} (${day(e.startDate)})`).join('; ')}. Be more specific.`);
    if (params.operation === 'reschedule' && !params.newDate && !params.newTime) warnings.push('Give the new date or time.');
    if (params.operation === 'cancel') warnings.push('Cancelling marks the event as cancelled on the calendar.');
    const one = m.length === 1 ? m[0] : null;
    return {
      title: params.operation === 'cancel' ? 'Cancel event' : 'Reschedule event',
      fields: [
        { key: 'titleQuery', label: 'Event', value: one?.title ?? params.titleQuery, type: 'text', editable: true },
        { key: 'operation', label: 'Do', value: params.operation, type: 'text', editable: true },
        ...(one ? [{ key: 'current', label: 'Currently', value: `${day(one.startDate)}${one.startTime ? ` at ${one.startTime}` : ''}`, type: 'text' as const, editable: false }] : []),
        ...(params.operation === 'reschedule' ? [
          { key: 'newDate', label: 'New date', value: params.newDate ?? '', type: 'date' as const, editable: true },
          { key: 'newTime', label: 'New time', value: params.newTime ?? '', type: 'time' as const, editable: true }] : []),
      ],
      warnings,
    };
  },
  async execute(ctx, params) {
    const m = await findEvents(ctx, params.titleQuery);
    if (m.length !== 1) throw new ValidationError(m.length ? 'More than one event matches — be more specific.' : 'No upcoming event with that name was found.');
    const id = String(m[0]._id);
    if (params.operation === 'cancel') {
      await eventService.updateStatus(id, { status: 'cancelled' }, ctx);
      return { summary: `"${m[0].title}" on ${day(m[0].startDate)} has been cancelled.` };
    }
    if (!params.newDate && !params.newTime) throw new ValidationError('Give the new date or time.');
    const spanDays = Math.round((m[0].endDate.getTime() - m[0].startDate.getTime()) / 86400000);
    const patch: Record<string, unknown> = {};
    if (params.newDate) {
      patch.startDate = params.newDate;
      const end = new Date(`${params.newDate}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + spanDays);
      patch.endDate = end.toISOString().slice(0, 10);
    }
    if (params.newTime) patch.startTime = params.newTime;
    await eventService.updateEvent(id, patch, ctx);
    return { summary: `"${m[0].title}" moved to ${params.newDate ?? day(m[0].startDate)}${params.newTime ? ` at ${params.newTime}` : ''}.` };
  },
  describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
};

// ── 3. Fee reminder to defaulters (in-app, to parent accounts) ───────────────

const feeReminderSchema = z.object({
  className: z.string().trim().max(20).default(''),
  section: z.string().trim().max(5).default(''),
  message: z.string().trim().max(500).default(''),
});
type FeeReminderParams = z.infer<typeof feeReminderSchema>;

async function resolveDefaulters(ctx: AuthContext, p: FeeReminderParams) {
  const match: Record<string, unknown> = {
    schoolId: ctx.schoolId, isDeleted: false, balance: { $gt: 0 }, status: { $in: ['pending', 'overdue', 'partially_paid'] },
  };
  if (p.className) match.class = { $in: classNameVariants(p.className) };
  if (p.section) match.section = p.section.toUpperCase();
  const rows = await FeeRecord.aggregate<{ _id: string; studentName: string; total: number }>([
    { $match: match }, { $group: { _id: '$studentId', studentName: { $first: '$studentName' }, total: { $sum: '$balance' } } },
  ]);
  const parents = rows.length
    ? await User.find({ schoolId: ctx.schoolId, role: 'parent', linkedStudentIds: { $in: rows.map((r) => r._id) } })
        .select('_id linkedStudentIds').lean<{ _id: unknown; linkedStudentIds: string[] }[]>()
    : [];
  const amountByStudent = new Map(rows.map((r) => [r._id, r]));
  return { students: rows.length, totalDue: rows.reduce((s, r) => s + r.total, 0), parents, amountByStudent };
}

export const feeReminderAction: ActionDefinition<FeeReminderParams, Awaited<ReturnType<typeof resolveDefaulters>>, { sent: number; students: number }> = {
  id: 'SEND_FEE_REMINDER',
  description: 'Send an in-app fee reminder to the parents of students who have unpaid fees, optionally for one class — "send fee reminders to defaulters", "class 8 ke fee defaulters ko reminder bhejo".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: feeReminderSchema,
  paramsShapeDescription: `
Fields:
- className (string, grade only like "8"): only for one class; empty for the whole school.
- section (letter): only if stated.
- message (string): an extra line to add, only if the Principal gave one; else empty.`.trim(),
  async buildPreview(ctx, params) { return resolveDefaulters(ctx, params); },
  describePreview(preview, params): ActionPreview {
    const warnings: string[] = [];
    if (!preview.students) warnings.push('No students with unpaid fees were found for this selection.');
    else if (!preview.parents.length) warnings.push('None of these students has a parent app login, so nobody would receive it.');
    else warnings.push(`This will be sent to ${preview.parents.length} parent accounts right away and cannot be undone. Each parent sees only their own child's due amount.`);
    return {
      title: 'Send fee reminder',
      fields: [
        { key: 'className', label: 'Class', value: params.className || 'All classes', type: 'text', editable: true },
        { key: 'section', label: 'Section', value: params.section, type: 'text', editable: true },
        { key: 'message', label: 'Extra line (optional)', value: params.message, type: 'textarea', editable: true },
        { key: 'students', label: 'Students with dues', value: `${preview.students} (total ${inr(preview.totalDue)})`, type: 'text', editable: false },
        { key: 'recipients', label: 'Will reach', value: `${preview.parents.length} parent accounts`, type: 'text', editable: false },
      ],
      warnings,
    };
  },
  async execute(ctx, params) {
    const r = await resolveDefaulters(ctx, params);
    let sent = 0;
    for (const parent of r.parents) {
      const owed = parent.linkedStudentIds.map((id) => r.amountByStudent.get(id)).filter((x): x is NonNullable<typeof x> => !!x);
      if (!owed.length) continue;
      const body = owed.map((o) => `${o.studentName}: ${inr(o.total)} due`).join('; ') + (params.message ? `. ${params.message}` : '. Please pay at the earliest.');
      await notificationService.sendToUser({ recipientUserId: String(parent._id), type: 'message', title: 'Fee reminder', body }, ctx);
      sent += 1;
    }
    return { sent, students: r.students };
  },
  describeResult: (r): ActionResultSummary => ({
    summary: `Fee reminder sent to ${r.sent} parent account${r.sent === 1 ? '' : 's'} (${r.students} students with dues).`, notifiedCount: r.sent,
  }),
};
