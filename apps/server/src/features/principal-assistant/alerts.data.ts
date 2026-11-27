import { SchoolPost } from '../school-posts/school-post.model';
import { Student } from '../students/student.model';
import { LeaveRequest } from '../leave-requests/leave-request.model';
import { MockTest } from '../mock-tests/mock-test.model';
import { Exam } from '../exams/exam.model';
import { FacilityRequest } from '../facility-requests/facility-request.model';
import { FollowUp } from '../follow-ups/follow-up.model';
import { InventoryItem } from '../inventory/inventory-item.model';
import { principalAssistantData } from './principal-assistant.data';
import { timetableService } from '../timetable/timetable.service';
import { attendanceRepository } from '../attendance/attendance.repository';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { extractQueryParams, escapeRegex, addDaysISO } from './query-params';
import { classNameVariants } from '../../lib/class-name';

// ── Attention alerts and homework status ─────────────────────────────────────
// Alerts are computed from live data with fixed thresholds (no AI), so the
// Principal can ask "what needs my attention" at any time, and the morning
// briefing leads with them.

const today = () => attendanceRepository.todayString();

export interface AlertLine { level: 'urgent' | 'attention'; text: string }

async function safe<T>(label: string, p: Promise<T>): Promise<T | null> {
  try { return await p; } catch (err) {
    logger.warn('[PrincipalAssistant] Alert check failed', { label, err: (err as Error).message });
    return null;
  }
}

export async function getAttentionAlerts(ctx: AuthContext): Promise<AlertLine[]> {
  const t = today();
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const [students, uncovered, oldLeaves, tests, exams, urgentMaint, missed, lowStock] = await Promise.all([
    safe('students', principalAssistantData.getStudentCounts(ctx)),
    safe('uncovered', timetableService.getNeedsSubstitute(ctx.schoolId, t)),
    safe('leaves', LeaveRequest.countDocuments({ schoolId: ctx.schoolId, status: 'pending', createdAt: { $lte: twoDaysAgo } })),
    safe('tests', MockTest.countDocuments({ schoolId: ctx.schoolId, status: 'pending_approval' })),
    safe('exams', Exam.find({ schoolId: ctx.schoolId, isDeleted: false, startDate: { $gte: new Date(`${t}T00:00:00`), $lte: new Date(`${addDaysISO(t, 2)}T23:59:59`) } }).select('name startDate').lean<{ name: string; startDate?: Date }[]>()),
    safe('maint', FacilityRequest.countDocuments({ schoolId: ctx.schoolId, isDeleted: false, status: { $in: ['open', 'assigned', 'in_progress'] }, priority: { $in: ['urgent', 'high'] } })),
    safe('missed', FollowUp.countDocuments({ schoolId: ctx.schoolId, isDeleted: false, status: 'missed' })),
    safe('stock', InventoryItem.countDocuments({ schoolId: ctx.schoolId, isDeleted: false, $expr: { $lte: ['$qtyAvailable', '$minStockLevel'] } })),
  ]);

  const out: AlertLine[] = [];
  if (uncovered && uncovered.length) out.push({ level: 'urgent', text: `${uncovered.length} period${uncovered.length === 1 ? '' : 's'} today ${uncovered.length === 1 ? 'has' : 'have'} no teacher (leave or absence) - assign substitutes.` });
  if (students && students.studentsTotal > 0 && students.attendanceRate < 75) out.push({ level: 'urgent', text: `Student attendance today is only ${Math.round(students.attendanceRate)}%.` });
  if (exams && exams.length) out.push({ level: 'attention', text: `${exams.length} exam${exams.length === 1 ? '' : 's'} starting within 2 days: ${exams.map((e) => e.name).join(', ')}.` });
  if (oldLeaves) out.push({ level: 'attention', text: `${oldLeaves} leave request${oldLeaves === 1 ? ' has' : 's have'} been waiting more than 2 days.` });
  if (tests) out.push({ level: 'attention', text: `${tests} mock test${tests === 1 ? '' : 's'} waiting for your approval.` });
  if (urgentMaint) out.push({ level: 'attention', text: `${urgentMaint} urgent/high-priority maintenance request${urgentMaint === 1 ? ' is' : 's are'} still open.` });
  if (missed) out.push({ level: 'attention', text: `${missed} admission follow-up${missed === 1 ? ' was' : 's were'} missed.` });
  if (lowStock) out.push({ level: 'attention', text: `${lowStock} inventory item${lowStock === 1 ? ' is' : 's are'} at or below minimum stock.` });
  return out;
}

export async function buildAlertsReply(ctx: AuthContext): Promise<string> {
  const alerts = await getAttentionAlerts(ctx);
  if (!alerts.length) return 'Nothing needs your attention right now.';
  const line = (a: AlertLine) => `- ${a.text}`;
  const urgent = alerts.filter((a) => a.level === 'urgent');
  const rest = alerts.filter((a) => a.level === 'attention');
  return [
    `${alerts.length} thing${alerts.length === 1 ? '' : 's'} need${alerts.length === 1 ? 's' : ''} your attention:`,
    ...(urgent.length ? ['URGENT', ...urgent.map(line)] : []),
    ...(rest.length ? ['TO CHECK', ...rest.map(line)] : []),
  ].join('\n');
}

/** Matches "alerts", "what needs my attention", "kuch urgent hai kya". */
export const ALERTS_PATTERN = /\balerts?\b|needs?\s+(my\s+)?attention|attention\s+needed|kya\s+urgent|kuch\s+urgent/i;

// ── Homework / school posts ──────────────────────────────────────────────────

async function getHomeworkStatus(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const start = new Date(`${today()}T00:00:00`);
  const posts = await SchoolPost.find({ schoolId: ctx.schoolId, isDeleted: false, kind: 'homework', createdAt: { $gte: start } })
    .select('title subject classes createdByName dueDate').lean<{ title: string; subject?: string; classes: { class: string; section: string }[]; createdByName: string; dueDate?: string }[]>();
  const classRows = await Student.aggregate<{ _id: { c: string; s: string } }>([
    { $match: { schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ['active', 'enrolled'] } } },
    { $group: { _id: { c: '$class', s: '$section' } } },
  ]);
  const key = (c: string, s: string) => `${c.toLowerCase()}|${s.toUpperCase()}`;
  const covered = new Set(posts.flatMap((x) => x.classes.map((c) => key(c.class, c.section))));
  let all = classRows.map((r) => r._id);
  if (p.className) { const v = new Set(classNameVariants(p.className).map((x) => x.toLowerCase())); all = all.filter((c) => v.has(c.c.toLowerCase())); }
  const missing = all.filter((c) => !covered.has(key(c.c, c.s))).map((c) => `${c.c}${c.s}`).sort();

  let teacherPosts: unknown;
  if (p.teacherName) {
    const last = await SchoolPost.find({ schoolId: ctx.schoolId, isDeleted: false, createdByName: new RegExp(escapeRegex(p.teacherName), 'i') })
      .sort({ createdAt: -1 }).limit(5).select('kind title createdAt createdByName').lean<{ kind: string; title: string; createdAt: Date; createdByName: string }[]>();
    teacherPosts = last.map((x) => ({ by: x.createdByName, kind: x.kind, title: x.title, on: x.createdAt.toISOString().slice(0, 10) }));
  }
  return {
    date: today(),
    homeworkPostedToday: posts.map((x) => ({ title: x.title, subject: x.subject, by: x.createdByName, classes: x.classes.map((c) => `${c.class}${c.section}`), due: x.dueDate })),
    classesWithNoHomeworkToday: missing,
    classesChecked: all.length,
    lastPostsByTeacher: teacherPosts,
    note: 'Sundays and holidays naturally have no homework.',
  };
}

export const homeworkAssistantData = { getHomeworkStatus };
