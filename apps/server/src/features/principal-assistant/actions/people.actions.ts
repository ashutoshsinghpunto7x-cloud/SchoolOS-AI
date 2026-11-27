import { z } from 'zod';
import { ActionDefinition, ActionPreview, ActionResultSummary } from '../action-registry';
import { AuthContext } from '../../../lib/auth-context';
import { PERMISSIONS } from '../../../lib/permissions';
import { classNameVariants } from '../../../lib/class-name';
import { ValidationError } from '../../../middlewares/errorHandler';
import { escapeRegex } from '../query-params';
import { attendanceRepository } from '../../attendance/attendance.repository';
import { Candidate } from '../../candidates/candidate.model';
import { candidateService } from '../../candidates/candidate.service';
import { User } from '../../users/user.model';
import { receptionTaskService } from '../../reception-tasks/reception-task.service';
import { Student } from '../../students/student.model';
import { attendanceService } from '../../attendance/attendance.service';

// ── Hiring decision, reception task, student excused ─────────────────────────
// Same contract as office.actions.ts: previews never mutate; execute re-resolves
// the single target and calls the real feature service.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => attendanceRepository.todayString();

// ── 1. Decide on a job candidate ─────────────────────────────────────────────

const candidateSchema = z.object({
  candidateName: z.string().trim().max(120).default(''),
  decision: z.enum(['review', 'select', 'hold', 'reject']).default('review'),
  reason: z.string().trim().max(500).default(''),
});
type CandidateParams = z.infer<typeof candidateSchema>;
interface CandHit { _id: unknown; name: string; positionApplied: string; status: string }

async function findCandidates(ctx: AuthContext, name: string): Promise<CandHit[]> {
  if (!name) return [];
  return Candidate.find({
    schoolId: ctx.schoolId, isDeleted: false, name: new RegExp(escapeRegex(name), 'i'),
    status: { $nin: ['selected', 'rejected'] },
  }).limit(6).select('name positionApplied status').lean<CandHit[]>();
}

const DECISION_LABEL: Record<CandidateParams['decision'], string> = {
  review: 'Move to under review', select: 'Select for the job', hold: 'Put on hold', reject: 'Reject',
};

export const reviewCandidateAction: ActionDefinition<CandidateParams, { matches: CandHit[] }, { summary: string }> = {
  id: 'REVIEW_CANDIDATE',
  description: 'Decide on a job candidate (a CV in hiring): select, hold, reject, or move to under review — "select Priya Verma for the maths post", "reject Rahul, not enough experience", "hold Neha\'s application".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: candidateSchema,
  paramsShapeDescription: `
Fields:
- candidateName (string): the candidate's name.
- decision ("review" | "select" | "hold" | "reject"): "select" for select/hire/shortlist-for-job, "hold" for hold/wait, "reject" for reject/decline, "review" for start reviewing / under review.
- reason (string): the reason for a rejection, else empty.`.trim(),
  async buildPreview(ctx, params) { return { matches: await findCandidates(ctx, params.candidateName) }; },
  describePreview(preview, params): ActionPreview {
    const m = preview.matches;
    const warnings: string[] = [];
    if (!params.candidateName) warnings.push('Tell me which candidate.');
    else if (!m.length) warnings.push(`No open candidate matching "${params.candidateName}" was found (already selected or rejected ones are excluded).`);
    else if (m.length > 1) warnings.push(`${m.length} candidates match: ${m.map((c) => `${c.name} (${c.positionApplied})`).join('; ')}. Use the full name.`);
    if (params.decision === 'reject' && !params.reason) warnings.push('A reason is required to reject.');
    if (params.decision === 'select' || params.decision === 'reject') warnings.push('Selecting or rejecting is a final decision and cannot be changed from here.');
    const one = m.length === 1 ? m[0] : null;
    return {
      title: DECISION_LABEL[params.decision],
      fields: [
        { key: 'candidateName', label: 'Candidate', value: one?.name ?? params.candidateName, type: 'text', editable: true },
        { key: 'decision', label: 'Decision', value: params.decision, type: 'text', editable: true },
        ...(one ? [
          { key: 'position', label: 'Position', value: one.positionApplied, type: 'text' as const, editable: false },
          { key: 'current', label: 'Current status', value: one.status.replace(/_/g, ' '), type: 'text' as const, editable: false }] : []),
        ...(params.decision === 'reject' ? [{ key: 'reason', label: 'Reason', value: params.reason, type: 'textarea' as const, editable: true }] : []),
      ],
      warnings: warnings.length ? warnings : undefined,
    };
  },
  async execute(ctx, params) {
    const m = await findCandidates(ctx, params.candidateName);
    if (m.length !== 1) throw new ValidationError(m.length ? 'More than one candidate matches — use the full name.' : 'No open candidate with that name was found.');
    const id = String(m[0]._id);
    if (params.decision === 'review') await candidateService.markUnderReview(id, ctx);
    else if (params.decision === 'select') await candidateService.setFinalDecision(id, { decision: 'selected' }, ctx);
    else if (params.decision === 'hold') await candidateService.setFinalDecision(id, { decision: 'hold' }, ctx);
    else await candidateService.setFinalDecision(id, { decision: 'rejected', rejectionReason: params.reason }, ctx);
    const word = { review: 'moved to under review', select: 'selected', hold: 'put on hold', reject: 'rejected' }[params.decision];
    return { summary: `${m[0].name} (${m[0].positionApplied}) ${word}.` };
  },
  describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
};

// ── 2. Assign a reception task ───────────────────────────────────────────────

const taskSchema = z.object({
  assigneeName: z.string().trim().max(120).default(''),
  title: z.string().trim().max(200).default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().regex(DATE_REGEX).default(todayISO),
});
type TaskParams = z.infer<typeof taskSchema>;
interface UserHit { _id: unknown; firstName: string; lastName: string; role: string }

async function findAssignees(ctx: AuthContext, name: string): Promise<UserHit[]> {
  if (!name) return [];
  const rx = new RegExp(escapeRegex(name).split(/\s+/).join('.*'), 'i');
  return User.find({
    schoolId: ctx.schoolId, role: { $in: ['reception', 'incharge'] }, status: 'active',
    $or: [{ firstName: rx }, { lastName: rx }, { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: rx.source, options: 'i' } } }],
  }).limit(6).select('firstName lastName role').lean<UserHit[]>();
}

export const assignReceptionTaskAction: ActionDefinition<TaskParams, { matches: UserHit[] }, { summary: string }> = {
  id: 'ASSIGN_RECEPTION_TASK',
  description: 'Give a task to a front-office / reception staff member — "ask Pooja to call the pending follow-ups today", "reception ko task do: collect admission forms by Friday".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: taskSchema,
  paramsShapeDescription: `
Fields:
- assigneeName (string): the staff member who should do it.
- title (string): the task, short and clear, from what the Principal said.
- priority ("low"|"medium"|"high"|"urgent"): "medium" unless they said urgent/important.
- dueDate (YYYY-MM-DD): the deadline; today if not stated.`.trim(),
  async buildPreview(ctx, params) { return { matches: await findAssignees(ctx, params.assigneeName) }; },
  describePreview(preview, params): ActionPreview {
    const m = preview.matches;
    const warnings: string[] = [];
    if (!params.assigneeName) warnings.push('Tell me who should do it.');
    else if (!m.length) warnings.push(`No active reception / front-office user matching "${params.assigneeName}" was found.`);
    else if (m.length > 1) warnings.push(`Several people match: ${m.map((u) => `${u.firstName} ${u.lastName}`).join(', ')}. Use the full name.`);
    if (!params.title) warnings.push('Say what the task is.');
    const one = m.length === 1 ? m[0] : null;
    return {
      title: 'Assign task',
      fields: [
        { key: 'assigneeName', label: 'Assign to', value: one ? `${one.firstName} ${one.lastName}` : params.assigneeName, type: 'text', editable: true },
        { key: 'title', label: 'Task', value: params.title, type: 'textarea', editable: true },
        { key: 'priority', label: 'Priority', value: params.priority, type: 'text', editable: true },
        { key: 'dueDate', label: 'Due', value: params.dueDate, type: 'date', editable: true },
      ],
      warnings: warnings.length ? warnings : undefined,
    };
  },
  async execute(ctx, params) {
    if (!params.title) throw new ValidationError('Say what the task is.');
    const m = await findAssignees(ctx, params.assigneeName);
    if (m.length !== 1) throw new ValidationError(m.length ? 'More than one person matches — use the full name.' : 'No reception user with that name was found.');
    await receptionTaskService.createTask({ title: params.title, priority: params.priority, dueDate: params.dueDate, assignedToId: String(m[0]._id) }, ctx);
    return { summary: `Task "${params.title}" assigned to ${m[0].firstName} ${m[0].lastName}, due ${params.dueDate}. They have been notified.` };
  },
  describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
};

// ── 3. Mark a student excused (approved leave) ───────────────────────────────

const excuseSchema = z.object({
  studentName: z.string().trim().max(120).default(''),
  className: z.string().trim().max(20).default(''),
  section: z.string().trim().max(5).default(''),
  date: z.string().regex(DATE_REGEX).default(todayISO),
  note: z.string().trim().max(300).default(''),
});
type ExcuseParams = z.infer<typeof excuseSchema>;
interface StudentHit { _id: unknown; fullName: string; class: string; section: string }

async function findStudents(ctx: AuthContext, p: ExcuseParams): Promise<StudentHit[]> {
  if (!p.studentName) return [];
  const tokens = p.studentName.split(/\s+/).filter(Boolean).slice(0, 4);
  const q: Record<string, unknown> = {
    schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ['active', 'enrolled'] },
    $and: tokens.map((t) => ({ fullName: new RegExp(escapeRegex(t), 'i') })),
  };
  if (p.className) q.class = { $in: classNameVariants(p.className) };
  if (p.section) q.section = p.section.toUpperCase();
  return Student.find(q).limit(6).select('fullName class section').lean<StudentHit[]>();
}

export const markStudentExcusedAction: ActionDefinition<ExcuseParams, { matches: StudentHit[] }, { summary: string }> = {
  id: 'MARK_STUDENT_EXCUSED',
  description: 'Mark a student as on approved leave / excused for a day in attendance — "mark Riya excused today, she is sick", "Aman ko kal ke liye leave de do".',
  requiredPermission: PERMISSIONS.ADMINISTRATION_MANAGE,
  paramsSchema: excuseSchema,
  paramsShapeDescription: `
Fields:
- studentName (string): the student's name only.
- className (string, grade only like "6") and section (letter): only if stated.
- date (YYYY-MM-DD): the day; today if not stated.
- note (string): the reason if given, else empty.`.trim(),
  async buildPreview(ctx, params) { return { matches: await findStudents(ctx, params) }; },
  describePreview(preview, params): ActionPreview {
    const m = preview.matches;
    const warnings: string[] = [];
    if (!params.studentName) warnings.push('Tell me which student.');
    else if (!m.length) warnings.push(`No active student matching "${params.studentName}" was found.`);
    else if (m.length > 1) warnings.push(`${m.length} students match: ${m.map((s) => `${s.fullName} (${s.class}${s.section})`).join('; ')}. Add the class and section.`);
    const one = m.length === 1 ? m[0] : null;
    return {
      title: 'Mark student excused',
      fields: [
        { key: 'studentName', label: 'Student', value: one?.fullName ?? params.studentName, type: 'text', editable: true },
        { key: 'className', label: 'Class', value: one?.class ?? params.className, type: 'text', editable: true },
        { key: 'section', label: 'Section', value: one?.section ?? params.section, type: 'text', editable: true },
        { key: 'date', label: 'Date', value: params.date, type: 'date', editable: true },
        { key: 'note', label: 'Reason', value: params.note, type: 'text', editable: true },
      ],
      warnings: warnings.length ? warnings : undefined,
    };
  },
  async execute(ctx, params) {
    const m = await findStudents(ctx, params);
    if (m.length !== 1) throw new ValidationError(m.length ? 'More than one student matches — add the class and section.' : 'No active student with that name was found.');
    const s = m[0];
    await attendanceService.markSingle({
      studentId: String(s._id), class: s.class, section: s.section, date: params.date, status: 'leave_approved', note: params.note || undefined,
    }, ctx);
    return { summary: `${s.fullName} (${s.class}${s.section}) marked excused (approved leave) for ${params.date}.` };
  },
  describeResult: (r): ActionResultSummary => ({ summary: r.summary }),
};
