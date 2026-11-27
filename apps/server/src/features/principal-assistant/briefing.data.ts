import { principalAssistantData } from './principal-assistant.data';
import { staffAssistantData } from './staff.data';
import { studentsAssistantData } from './students.data';
import { opsAssistantData } from './ops.data';
import { AuthContext } from '../../lib/auth-context';
import { getAttentionAlerts } from './alerts.data';
import { logger } from '../../lib/logger';

// ── Morning briefing ──────────────────────────────────────────────────────────
// One answer that stitches together figures the assistant already computes for
// individual questions. Each section is fetched independently: if one fails or
// has nothing, only that line changes — the rest of the briefing still shows.
// The text is built deterministically (no extra LLM call), so every number is
// exactly what the individual question would return.

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function safe<T>(label: string, p: Promise<T>): Promise<T | null> {
  try { return await p; } catch (err) {
    logger.warn('[PrincipalAssistant] Briefing section failed', { label, err: (err as Error).message });
    return null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function buildMorningBriefing(ctx: AuthContext): Promise<string> {
  const alerts = (await safe('alerts', getAttentionAlerts(ctx))) ?? [];
  const [students, teachers, leaveDays, pendingLeaves, fees, tests, purchases, events, visitors, followUps, maint, examGaps] = await Promise.all([
    safe('students', principalAssistantData.getStudentCounts(ctx)),
    safe('teachers', principalAssistantData.getTeacherCounts(ctx)),
    safe('leave', staffAssistantData.getTeachersOnLeave(ctx, '')),
    safe('pendingLeaves', staffAssistantData.getPendingLeaves(ctx)),
    safe('fees', studentsAssistantData.getFeeCollectionByPeriod(ctx)),
    safe('tests', opsAssistantData.getPendingApprovals(ctx)),
    safe('purchases', opsAssistantData.getPendingPurchasesAndExpenses(ctx)),
    safe('events', opsAssistantData.getUpcomingEvents(ctx)),
    safe('visitors', opsAssistantData.getVisitorsToday(ctx)),
    safe('followUps', opsAssistantData.getPendingFollowUps(ctx)),
    safe('maint', opsAssistantData.getOpenMaintenance(ctx)),
    safe('examGaps', opsAssistantData.getExamsMissingMarks(ctx)),
  ]);

  const lines: string[] = [`Daily briefing for ${new Date().toISOString().slice(0, 10)}`, ''];

  if (alerts.length) lines.push('NEEDS ATTENTION', ...alerts.map((a) => `- ${a.text}`), '');
  lines.push('ATTENDANCE');
  lines.push(students
    ? (students.studentsTotal
        ? `- Students: ${students.studentsPresent}/${students.studentsTotal} present (${Math.round(students.attendanceRate)}%), ${students.studentsAbsent} absent.`
        : '- Students: attendance has not been marked yet today.')
    : '- Students: could not be loaded.');
  lines.push(teachers
    ? `- Teachers: ${teachers.teachersPresent}/${teachers.teachersTotal} present, ${teachers.teachersAbsent} not checked in.`
    : '- Teachers: could not be loaded.');
  const todayLeave: any = (leaveDays as any)?.days?.[0]?.onLeave ?? [];
  const tomorrowLeave: any = (leaveDays as any)?.days?.[1]?.onLeave ?? [];
  if (leaveDays) {
    lines.push(`- On approved leave: today ${todayLeave.length ? todayLeave.map((l: any) => l.name).join(', ') : 'nobody'}; tomorrow ${tomorrowLeave.length ? tomorrowLeave.map((l: any) => l.name).join(', ') : 'nobody'}.`);
  }

  lines.push('', 'FEES');
  lines.push(fees
    ? `- Collected today ${inr((fees as any).collectedToday.amount)} (${plural((fees as any).collectedToday.payments, 'payment')}); this month ${inr((fees as any).collectedThisMonth.amount)}.`
    : '- Could not be loaded.');

  lines.push('', 'NEEDS YOUR DECISION');
  const waiting: string[] = [];
  if (pendingLeaves) waiting.push(`${plural((pendingLeaves as any).pendingCount, 'leave request')}`);
  if (tests) waiting.push(`${plural((tests as any).mockTestsAwaitingApproval.length, 'mock test')} to approve`);
  if (purchases) {
    waiting.push(`${plural((purchases as any).pendingPurchaseRequests.length, 'purchase request')}`);
    waiting.push(`${plural((purchases as any).pendingExpenses.length, 'expense')} (${inr((purchases as any).pendingExpensesTotal)})`);
  }
  lines.push(waiting.length ? `- ${waiting.join(', ')}.` : '- Could not be loaded.');

  lines.push('', 'ACADEMICS');
  lines.push(examGaps
    ? ((examGaps as any).examsWithGaps
        ? `- ${plural((examGaps as any).examsWithGaps, 'exam')} with marks not yet entered: ${(examGaps as any).exams.map((e: any) => e.exam).join(', ')}.`
        : '- No exams are waiting for marks entry.')
    : '- Could not be loaded.');

  lines.push('', 'FRONT OFFICE AND OPERATIONS');
  if (visitors) lines.push(`- Visitors today: ${(visitors as any).total}${(visitors as any).waitingNow.length ? `, waiting now: ${(visitors as any).waitingNow.join(', ')}` : ''}.`);
  if (followUps) lines.push(`- Admission follow-ups due or missed: ${(followUps as any).dueOrOverdue} (${(followUps as any).missed} missed).`);
  if (maint) lines.push(`- Open maintenance requests: ${(maint as any).openCount} (${(maint as any).urgent} urgent/high).`);
  if (events) {
    const next = (events as any).next60Days?.[0];
    lines.push(next ? `- Next event: ${next.title} on ${next.from}.` : '- No upcoming events in the next 60 days.');
  }

  return lines.join('\n');
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Matches "daily briefing", "morning summary", "good morning", "subah ka briefing" etc. */
export const BRIEFING_PATTERN = /\b(daily|morning|school)\s+(briefing|summary|report|update)\b|\bbriefing\b|\bgood\s+morning\b|सुबह.*(सारांश|ब्रीफिंग|रिपोर्ट)|\b(subah|aaj)\s+ka\s+(briefing|summary|report)\b/i;
