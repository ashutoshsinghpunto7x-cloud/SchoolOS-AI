import { z } from 'zod';
import { ActionDefinition, ActionPreview, ActionResultSummary } from '../action-registry';
import { AuthContext } from '../../../lib/auth-context';
import { PERMISSIONS } from '../../../lib/permissions';
import { classNameVariants } from '../../../lib/class-name';
import { ValidationError } from '../../../middlewares/errorHandler';
import { LeaveRequest } from '../../leave-requests/leave-request.model';
import { leaveRequestService } from '../../leave-requests/leave-request.service';
import { eventService } from '../../events/event.service';
import { Teacher } from '../../teachers/teacher.model';
import { Student } from '../../students/student.model';
import { Attendance } from '../../attendance/attendance.model';
import { User } from '../../users/user.model';
import { staffAttendanceService } from '../../staff-attendance/staff-attendance.service';
import { notificationService } from '../../notifications/notification.service';
import { teacherRepository } from '../../teachers/teacher.repository';
import { attendanceRepository } from '../../attendance/attendance.repository';
import { escapeRegex } from '../query-params';

// ── Principal-assistant actions beyond meetings ──────────────────────────────
// Same contract as meeting.action.ts: buildPreview never mutates, execute calls
// the real feature service, and the Principal confirms before anything happens.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const todayISO = () => attendanceRepository.todayString();
const tomorrowISO = () => {
  const d = new Date(`${todayISO()}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

// ── 1. Approve / reject a leave request ──────────────────────────────────────

const leaveSchema = z.object({
  teacherName: z.string().trim().max(120).default(''),
  decision: z.enum(['approve', 'reject']).default('approve'),
  reviewNote: z.string().trim().max(500).default(''),
});
type LeaveParams = z.infer<typeof leaveSchema>;

async function findPendingLeaves(ctx: AuthContext, teacherName: string) {
  if (!teacherName) return [];
  return LeaveRequest.find({ schoolId: ctx.schoolId, status: 'pending', teacherName: new RegExp(escapeRegex(teacherName), 'i') })
    .sort({ createdAt: 1 }).lean<{ _id: unknown; teacherName: string; dateFrom: string; dateTo: string; leaveType: string; reason: string }[]>();
}

export const reviewLeaveAction: ActionDefinition<LeaveParams, { matches: Awaited<ReturnType<typeof findPendingLeaves>> }, { summary: string }> = {
  id: 'REVIEW_LEAVE_REQUEST',
  description: 'Approve or reject a teacher\'s pending leave request — "approve Mrs Sharma\'s leave", "reject Rahul\'s leave, we have exams".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: leaveSchema,
  paramsShapeDescription: `
Fields:
- teacherName (string): the teacher whose leave request is being decided, name only (no "sir"/"madam"/"Mrs").
- decision ("approve" | "reject"): what the Principal wants. Default "approve" only if they said approve/accept/grant.
- reviewNote (string): the reason given for a rejection, else empty.`.trim(),
  async buildPreview(ctx, params) {
    return { matches: await findPendingLeaves(ctx, params.teacherName) };
  },
  describePreview(preview, params): ActionPreview {
    const m = preview.matches;
    const warnings: string[] = [];
    if (!params.teacherName) warnings.push('Tell me which teacher\'s leave this is for.');
    else if (!m.length) warnings.push(`No pending leave request found for "${params.teacherName}".`);
    else if (m.length > 1) warnings.push(`${m.length} pending requests match — please use the exact teacher name (matches: ${[...new Set(m.map((x) => x.teacherName))].join(', ')}).`);
    const one = m.length === 1 ? m[0] : null;
    return {
      title: params.decision === 'approve' ? 'Approve leave' : 'Reject leave',
      fields: [
        { key: 'teacherName', label: 'Teacher', value: one?.teacherName ?? params.teacherName, type: 'text', editable: true },
        { key: 'decision', label: 'Decision', value: params.decision, type: 'text', editable: true },
        ...(one ? [{ key: 'dates', label: 'Dates', value: `${one.dateFrom}${one.dateTo !== one.dateFrom ? ` to ${one.dateTo}` : ''} (${one.leaveType === 'half_day' ? 'half day' : 'full day'})`, type: 'text' as const, editable: false },
          { key: 'reason', label: 'Reason given', value: one.reason, type: 'text' as const, editable: false }] : []),
        ...(params.decision === 'reject' ? [{ key: 'reviewNote', label: 'Note to teacher', value: params.reviewNote, type: 'textarea' as const, editable: true }] : []),
      ],
      warnings: warnings.length ? warnings : undefined,
    };
  },
  async execute(ctx, params) {
    const m = await findPendingLeaves(ctx, params.teacherName);
    if (m.length !== 1) throw new ValidationError(m.length ? 'More than one pending request matches — use the exact teacher name.' : 'No pending leave request found for that teacher.');
    const id = String(m[0]._id);
    if (params.decision === 'approve') await leaveRequestService.approve(id, ctx);
    else await leaveRequestService.reject(id, { reviewNote: params.reviewNote || undefined }, ctx);
    return { summary: `${m[0].teacherName}'s leave (${m[0].dateFrom}) ${params.decision === 'approve' ? 'approved' : 'rejected'}.` };
  },
  describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
};

// ── 2. Create an event / holiday / PTM ───────────────────────────────────────

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200).default('School Event'),
  eventType: z.enum(['holiday', 'ptm', 'examination', 'school_event', 'general']).default('school_event'),
  date: z.string().regex(DATE_REGEX).default(tomorrowISO),
  endDate: z.string().regex(DATE_REGEX).optional(),
  startTime: z.string().regex(TIME_REGEX).optional(),
  location: z.string().trim().max(300).default(''),
  notes: z.string().trim().max(1000).default(''),
});
type EventParams = z.infer<typeof eventSchema>;

export const createEventAction: ActionDefinition<EventParams, Record<string, never>, { title: string; date: string }> = {
  id: 'CREATE_EVENT',
  description: 'Create a school event, holiday, PTM or exam date on the calendar — "add a holiday on Friday", "create a PTM on 5 December". (Staff meetings → SCHEDULE_STAFF_MEETING.)',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: eventSchema,
  paramsShapeDescription: `
Fields:
- title (string): short event name, e.g. "Diwali Holiday", "Parent Teacher Meeting".
- eventType ("holiday" | "ptm" | "examination" | "school_event" | "general"): best fit.
- date (string, YYYY-MM-DD): the (first) day. Resolve relative dates against today.
- endDate (string, YYYY-MM-DD, optional): last day only for multi-day events.
- startTime (string, HH:MM 24-hour, optional), location (string), notes (string).`.trim(),
  async buildPreview() { return {}; },
  describePreview(_p, params): ActionPreview {
    return {
      title: 'Create event',
      fields: [
        { key: 'title', label: 'Title', value: params.title, type: 'text', editable: true },
        { key: 'eventType', label: 'Type', value: params.eventType, type: 'text', editable: true },
        { key: 'date', label: 'Date', value: params.date, type: 'date', editable: true },
        { key: 'endDate', label: 'End date', value: params.endDate ?? params.date, type: 'date', editable: true },
        { key: 'startTime', label: 'Time', value: params.startTime ?? '', type: 'time', editable: true },
        { key: 'location', label: 'Venue', value: params.location, type: 'text', editable: true },
        { key: 'notes', label: 'Notes', value: params.notes, type: 'textarea', editable: true },
      ],
    };
  },
  async execute(ctx, params) {
    const event = await eventService.createEvent({
      title: params.title, eventType: params.eventType, status: 'published',
      startDate: params.date, endDate: params.endDate ?? params.date,
      startTime: params.startTime || undefined, isAllDay: !params.startTime,
      location: params.location || undefined, notes: params.notes || undefined,
      audience: ['all'],
    }, ctx);
    return { title: event.title, date: params.date };
  },
  describeResult: (r): ActionResultSummary => ({ summary: `"${r.title}" added to the calendar for ${r.date}.` }),
};

// ── 3. Mark a teacher absent ─────────────────────────────────────────────────

const markAbsentSchema = z.object({ teacherName: z.string().trim().max(120).default('') });
type MarkAbsentParams = z.infer<typeof markAbsentSchema>;

async function findTeachers(ctx: AuthContext, name: string) {
  if (!name) return [];
  return Teacher.find({ schoolId: ctx.schoolId, isDeleted: false, fullName: new RegExp(escapeRegex(name), 'i') })
    .select('fullName employeeId').limit(5).lean<{ fullName: string; employeeId: string }[]>();
}

export const markTeacherAbsentAction: ActionDefinition<MarkAbsentParams, { matches: { fullName: string; employeeId: string }[] }, { name: string }> = {
  id: 'MARK_TEACHER_ABSENT',
  description: 'Mark a teacher ABSENT for today in staff attendance — "mark Rahul sir absent today", "Mrs Gupta aaj nahi aayi, absent mark karo".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: markAbsentSchema,
  paramsShapeDescription: `Fields:\n- teacherName (string): the teacher's name only, no titles.`,
  async buildPreview(ctx, params) { return { matches: await findTeachers(ctx, params.teacherName) }; },
  describePreview(preview, params): ActionPreview {
    const warnings: string[] = [];
    if (!preview.matches.length) warnings.push(`No teacher matching "${params.teacherName}" was found.`);
    if (preview.matches.length > 1) warnings.push(`Several teachers match: ${preview.matches.map((m) => m.fullName).join(', ')}. Use the full name.`);
    return {
      title: 'Mark teacher absent',
      fields: [
        { key: 'teacherName', label: 'Teacher', value: preview.matches.length === 1 ? preview.matches[0].fullName : params.teacherName, type: 'text', editable: true },
        { key: 'date', label: 'Date', value: todayISO(), type: 'text', editable: false },
      ],
      warnings: warnings.length ? warnings : undefined,
    };
  },
  async execute(ctx, params) {
    const m = await findTeachers(ctx, params.teacherName);
    if (m.length !== 1) throw new ValidationError(m.length ? 'More than one teacher matches — use the full name.' : 'No teacher with that name was found.');
    await staffAttendanceService.markManual({ employeeId: m[0].employeeId, status: 'absent' }, ctx);
    return { name: m[0].fullName };
  },
  describeResult: (r): ActionResultSummary => ({ summary: `${r.name} marked absent for today.` }),
};

// ── 4. Send a notice (in-app) to teachers or parents ─────────────────────────

const noticeSchema = z.object({
  audience: z.enum(['teachers', 'all_parents', 'class_parents', 'absent_students_parents']).default('teachers'),
  className: z.string().trim().max(20).default(''),
  section: z.string().trim().max(5).default(''),
  title: z.string().trim().min(1).max(120).default('Notice from the Principal'),
  message: z.string().trim().max(1000).default(''),
});
type NoticeParams = z.infer<typeof noticeSchema>;

/** Parent login accounts to notify, plus how many students that covers. */
async function resolveNoticeRecipients(ctx: AuthContext, p: NoticeParams): Promise<{ userIds: string[]; students: number; teacherIds: string[] }> {
  if (p.audience === 'teachers') {
    const { teachers } = await teacherRepository.findAll(ctx.schoolId, { limit: 100 });
    return { userIds: [], students: 0, teacherIds: teachers.map((t) => String(t._id)) };
  }
  let studentIds: string[];
  if (p.audience === 'absent_students_parents') {
    const rows = await Attendance.find({ schoolId: ctx.schoolId, date: todayISO(), status: 'absent', isDeleted: false })
      .select('studentId').lean<{ studentId: string }[]>();
    studentIds = rows.map((r) => r.studentId);
  } else {
    const q: Record<string, unknown> = { schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ['active', 'enrolled'] } };
    if (p.audience === 'class_parents' && p.className) {
      q.class = { $in: classNameVariants(p.className) };
      if (p.section) q.section = p.section.toUpperCase();
    }
    studentIds = (await Student.find(q).select('_id').lean<{ _id: unknown }[]>()).map((s) => String(s._id));
  }
  const parents = studentIds.length
    ? await User.find({ schoolId: ctx.schoolId, role: 'parent', linkedStudentIds: { $in: studentIds } }).select('_id').lean<{ _id: unknown }[]>()
    : [];
  return { userIds: parents.map((u) => String(u._id)), students: studentIds.length, teacherIds: [] };
}

const AUDIENCE_LABEL: Record<NoticeParams['audience'], string> = {
  teachers: 'All teachers', all_parents: 'All parents', class_parents: 'Parents of one class',
  absent_students_parents: "Parents of today's absent students",
};

export const sendNoticeAction: ActionDefinition<NoticeParams, { recipients: number; students: number }, { sent: number; label: string }> = {
  id: 'SEND_NOTICE',
  description: 'Send a notice / message in the app to teachers, all parents, one class\'s parents, or the parents of today\'s absent students — "send a notice to all parents about tomorrow\'s holiday", "message parents of absent students".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: noticeSchema,
  paramsShapeDescription: `
Fields:
- audience ("teachers" | "all_parents" | "class_parents" | "absent_students_parents").
- className (string, grade only like "5") and section (letter) — only for class_parents.
- title (string): a short heading. message (string): the notice text, written clearly from what the Principal said (translate nothing; keep their language).`.trim(),
  async buildPreview(ctx, params) {
    const r = await resolveNoticeRecipients(ctx, params);
    return { recipients: params.audience === 'teachers' ? r.teacherIds.length : r.userIds.length, students: r.students };
  },
  describePreview(preview, params): ActionPreview {
    const warnings: string[] = [];
    if (!params.message) warnings.push('The notice text is empty — add what you want to say.');
    if (params.audience === 'class_parents' && !params.className) warnings.push('Say which class.');
    if (!preview.recipients) warnings.push('No one with an app login was found for this audience, so nobody would receive it.');
    if (preview.recipients > 0) {
      warnings.push(`This will be sent to ${preview.recipients} ${params.audience === 'teachers' ? 'teachers' : 'parent accounts'} right away and cannot be undone.`);
    }
    if (params.audience !== 'teachers' && preview.students > preview.recipients) warnings.push('Only parents with an app login get in-app notices; WhatsApp is not used here.');
    return {
      title: 'Send notice',
      fields: [
        { key: 'audience', label: 'To', value: AUDIENCE_LABEL[params.audience], type: 'text', editable: false },
        ...(params.audience === 'class_parents' ? [
          { key: 'className', label: 'Class', value: params.className, type: 'text' as const, editable: true },
          { key: 'section', label: 'Section', value: params.section, type: 'text' as const, editable: true }] : []),
        { key: 'title', label: 'Title', value: params.title, type: 'text', editable: true },
        { key: 'message', label: 'Message', value: params.message, type: 'textarea', editable: true },
        { key: 'recipients', label: 'Will reach', value: `${preview.recipients} ${params.audience === 'teachers' ? 'teachers' : 'parent accounts'}`, type: 'text', editable: false },
      ],
      warnings: warnings.length ? warnings : undefined,
    };
  },
  async execute(ctx, params) {
    if (!params.message) throw new ValidationError('The notice text is empty.');
    const r = await resolveNoticeRecipients(ctx, params);
    let sent = 0;
    if (params.audience === 'teachers') {
      sent = (await notificationService.sendToTeachers({ teacherIds: r.teacherIds, type: 'message', title: params.title, body: params.message }, ctx)).sent;
    } else {
      for (const userId of r.userIds) {
        await notificationService.sendToUser({ recipientUserId: userId, type: 'message', title: params.title, body: params.message }, ctx);
        sent += 1;
      }
    }
    return { sent, label: AUDIENCE_LABEL[params.audience] };
  },
  describeResult: (r): ActionResultSummary => ({ summary: `Notice sent to ${r.sent} recipient${r.sent === 1 ? '' : 's'} (${r.label.toLowerCase()}).`, notifiedCount: r.sent }),
};
