import { User } from '../users/user.model';
import { studentRepository } from '../students/student.repository';
import { attendanceRepository } from '../attendance/attendance.repository';
import { feeRepository } from '../fees/fee.repository';
import { marksRepository } from '../marks/marks.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { periodSlotRepository } from '../timetable/timetable.period.repository';
import { eventRepository } from '../events/event.repository';
import { NotFoundError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import type { IStudent } from '../students/student.model';
import type { ISchoolEvent } from '../events/event.model';

// ── Response shapes — mirrored on the frontend in
// apps/web/src/features/parent-workspace/types.ts. Not lifted into
// @schoolos/types since nothing else consumes them yet. ─────────────────────

export interface ChildSummary {
  _id: string;
  name: string;
  grade: string;
  section: string;
  photoUrl?: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  checkedInAt?: string;
  attendancePercent: number;
  academicAverage: number;
  feeStatus: 'paid' | 'due' | 'overdue';
  feeDueAmount?: number;
  nextEvent?: { date: string; label: string };
}

export interface ScheduleEntry {
  _id: string;
  time: string;
  subject: string;
  detail: string;
  teacher?: string;
  isCurrent?: boolean;
  isDone?: boolean;
}

export interface SubjectSnapshot {
  _id: string;
  subject: string;
  note: string;
  percent: number;
  trend: 'up' | 'steady' | 'down';
}

export interface AttentionItem {
  _id: string;
  title: string;
  detail: string;
  actionLabel: string;
  kind: 'fee' | 'event' | 'academic' | 'document';
}

export interface SchoolUpdate {
  _id: string;
  title: string;
  when: string;
  location?: string;
}

export interface AIInsight {
  headline: string;
  recommendation: string;
}

export interface NotificationItem {
  _id: string;
  category: 'important' | 'school' | 'academic' | 'fees' | 'events';
  title: string;
  detail: string;
  when: string;
  read: boolean;
}

export interface ParentWorkspaceBundle {
  parent: { _id: string; name: string };
  children: ChildSummary[];
  schedule: ScheduleEntry[];
  subjects: SubjectSnapshot[];
  attention: AttentionItem[];
  updates: SchoolUpdate[];
  insight: AIInsight;
  notifications: NotificationItem[];
}

function formatEventWhen(event: ISchoolEvent): string {
  const now = new Date();
  const start = new Date(event.startDate);
  const isToday = start.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = start.toDateString() === tomorrow.toDateString();

  const datePart = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return event.startTime ? `${datePart} · ${event.startTime}` : datePart;
}

function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export const parentWorkspaceService = {
  /** Which students this parent account may see. Re-read from the User
   *  document (not the JWT) so an admin re-linking a parent's children takes
   *  effect on the parent's next request, not just their next login. */
  async getLinkedStudentIds(ctx: AuthContext): Promise<string[]> {
    const user = await User.findOne({ _id: ctx.userId, schoolId: ctx.schoolId }).lean();
    return user?.linkedStudentIds ?? [];
  },

  async getWorkspace(ctx: AuthContext, activeChildId?: string): Promise<ParentWorkspaceBundle> {
    const linkedStudentIds = await this.getLinkedStudentIds(ctx);

    const studentDocs = (
      await Promise.all(linkedStudentIds.map((id) => studentRepository.findById(id, ctx.schoolId)))
    ).filter((s): s is IStudent => !!s && s.admissionStatus !== 'inactive');

    if (studentDocs.length === 0) {
      return {
        parent: { _id: ctx.userId, name: ctx.displayName },
        children: [],
        schedule: [],
        subjects: [],
        attention: [],
        updates: [],
        insight: { headline: 'No children are linked to this account yet.', recommendation: 'Ask the school office to link your child\'s profile to this login.' },
        notifications: [],
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const yearStart = `${new Date().getFullYear()}-01-01`;

    const children: ChildSummary[] = await Promise.all(
      studentDocs.map(async (student) => {
        const studentId = student._id.toString();

        const [attendanceSummary, todayAttendance, feeRecords, marksResult] = await Promise.all([
          attendanceRepository.getSummary(ctx.schoolId, { studentId, dateFrom: yearStart, dateTo: today }),
          attendanceRepository.findByStudentAndDate(ctx.schoolId, studentId, today),
          feeRepository.findByStudent(ctx.schoolId, studentId),
          marksRepository.findAll(ctx.schoolId, { studentId, workflowStatus: 'published', limit: 200 }),
        ]);

        const outstanding = feeRecords.filter((f) => f.balance > 0);
        const overdue = outstanding.some((f) => f.status === 'overdue');
        const feeStatus: ChildSummary['feeStatus'] = outstanding.length === 0 ? 'paid' : overdue ? 'overdue' : 'due';
        const feeDueAmount = outstanding.reduce((sum, f) => sum + f.balance, 0);

        const publishedMarks = marksResult.records.filter((m) => typeof m.percentage === 'number');
        const academicAverage = publishedMarks.length > 0
          ? Math.round((publishedMarks.reduce((sum, m) => sum + (m.percentage ?? 0), 0) / publishedMarks.length) / 10 * 10) / 10
          : 0;

        const upcomingEvents = await eventRepository.findUpcoming(ctx.schoolId, 1, 60);
        const nextEvent = upcomingEvents[0]
          ? { date: new Date(upcomingEvents[0].startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), label: upcomingEvents[0].title }
          : undefined;

        let status: ChildSummary['status'] = 'absent';
        let checkedInAt: string | undefined;
        if (todayAttendance) {
          if (todayAttendance.status === 'present' || todayAttendance.status === 'late' || todayAttendance.status === 'half_day') {
            status = 'present';
            checkedInAt = todayAttendance.markedAt
              ? new Date(todayAttendance.markedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : undefined;
          } else if (todayAttendance.status === 'leave_approved') {
            status = 'holiday';
          }
        }

        return {
          _id: studentId,
          name: student.fullName,
          grade: student.class,
          section: student.section,
          photoUrl: student.photoUrl,
          status,
          checkedInAt,
          attendancePercent: attendanceSummary.attendanceRate,
          academicAverage,
          feeStatus,
          feeDueAmount: feeDueAmount > 0 ? feeDueAmount : undefined,
          nextEvent,
        };
      }),
    );

    const activeChild = children.find((c) => c._id === activeChildId) ?? children[0];
    const activeStudent = studentDocs.find((s) => s._id.toString() === activeChild._id)!;

    // ── Today's schedule ──────────────────────────────────────────────────
    const [timetable, periodSlots] = await Promise.all([
      timetableRepository.findByClassSectionAnyYear(ctx.schoolId, activeStudent.class, activeStudent.section),
      periodSlotRepository.findAll(ctx.schoolId),
    ]);

    const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Mon..7=Sun, matches seed data's 1..6 range
    const slotById = new Map(periodSlots.map((s) => [s._id.toString(), s]));
    const nowHHMM = new Date().toTimeString().slice(0, 5);

    const schedule: ScheduleEntry[] = (timetable?.entries ?? [])
      .filter((e) => e.dayOfWeek === dayOfWeek)
      .map((e) => {
        const slot = slotById.get(e.slotId);
        return { entry: e, slot };
      })
      .filter((x) => x.slot)
      .sort((a, b) => (a.slot!.startTime < b.slot!.startTime ? -1 : 1))
      .map((x) => ({
        _id: x.entry._id?.toString() ?? `${x.slot!._id}-${x.entry.subjectName}`,
        time: x.slot!.startTime,
        subject: x.entry.subjectName,
        detail: [x.entry.roomNumber].filter(Boolean).join(' · ') || `${to12Hour(x.slot!.startTime)} – ${to12Hour(x.slot!.endTime)}`,
        teacher: x.entry.teacherName,
        isCurrent: nowHHMM >= x.slot!.startTime && nowHHMM < x.slot!.endTime,
        isDone: nowHHMM >= x.slot!.endTime,
      }));

    // ── Subject-wise learning snapshot ───────────────────────────────────
    const activeMarksResult = await marksRepository.findAll(ctx.schoolId, { studentId: activeChild._id, workflowStatus: 'published', limit: 200 });
    const bySubject = new Map<string, typeof activeMarksResult.records>();
    for (const m of activeMarksResult.records) {
      if (typeof m.percentage !== 'number') continue;
      const list = bySubject.get(m.subjectName) ?? [];
      list.push(m);
      bySubject.set(m.subjectName, list);
    }
    const subjects: SubjectSnapshot[] = Array.from(bySubject.entries()).map(([subjectName, records], i) => {
      const sorted = [...records].sort((a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime());
      const latest = sorted[sorted.length - 1];
      const prior = sorted[sorted.length - 2];
      const percent = Math.round(latest.percentage ?? 0);
      const trend: SubjectSnapshot['trend'] = !prior
        ? 'steady'
        : (latest.percentage ?? 0) - (prior.percentage ?? 0) > 2 ? 'up'
        : (latest.percentage ?? 0) - (prior.percentage ?? 0) < -2 ? 'down' : 'steady';
      const note = trend === 'up' ? 'Improving steadily' : trend === 'down' ? 'Needs a bit more practice' : 'Consistent performance';
      return { _id: `subj-${i}-${subjectName}`, subject: subjectName, note, percent, trend };
    });

    // ── Needs Your Attention ─────────────────────────────────────────────
    const attention: AttentionItem[] = [];
    const activeOutstanding = await feeRepository.findByStudent(ctx.schoolId, activeChild._id);
    const dueFees = activeOutstanding.filter((f) => f.balance > 0);
    if (dueFees.length > 0) {
      const total = dueFees.reduce((s, f) => s + f.balance, 0);
      const soonest = dueFees.reduce((a, b) => (new Date(a.dueDate) < new Date(b.dueDate) ? a : b));
      attention.push({
        _id: 'fee-due',
        title: `${soonest.description || 'Fee'} due`,
        detail: `₹${total.toLocaleString('en-IN')} · due ${new Date(soonest.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
        actionLabel: 'View',
        kind: 'fee',
      });
    }
    const upcoming = await eventRepository.findUpcoming(ctx.schoolId, 5, 21);
    const parentFacing = upcoming.filter((e) => e.audience.includes('parents') || e.audience.includes('all'));
    if (parentFacing[0]) {
      attention.push({
        _id: `event-${parentFacing[0]._id}`,
        title: parentFacing[0].title,
        detail: formatEventWhen(parentFacing[0]),
        actionLabel: 'View',
        kind: 'event',
      });
    }

    // ── School Updates ────────────────────────────────────────────────────
    const updates: SchoolUpdate[] = upcoming.slice(0, 5).map((e) => ({
      _id: e._id.toString(),
      title: e.title,
      when: formatEventWhen(e),
      location: e.location,
    }));

    // ── AI insight — rule-based summary over real attendance/marks data ──
    const weakest = subjects.length > 0 ? [...subjects].sort((a, b) => a.percent - b.percent)[0] : undefined;
    const strongest = subjects.length > 0 ? [...subjects].sort((a, b) => b.percent - a.percent)[0] : undefined;
    const firstName = activeChild.name.split(' ')[0];
    const insight: AIInsight = subjects.length === 0
      ? {
          headline: `No published marks yet for ${firstName}.`,
          recommendation: 'Insights will appear here once the first exam results are published.',
        }
      : {
          headline: strongest
            ? `${firstName} is performing strongest in ${strongest.subject} (${strongest.percent}%).`
            : `${firstName}'s attendance this term is ${activeChild.attendancePercent}%.`,
          recommendation: weakest
            ? `${weakest.subject} could use the most attention right now, currently at ${weakest.percent}%.`
            : 'Keep up the consistent attendance and effort.',
        };

    // ── Notifications — derived from the same real signals, not a separate
    // stored feed (no parent-facing notification type exists yet). ────────
    const notifications: NotificationItem[] = [];
    if (dueFees.length > 0) {
      const total = dueFees.reduce((s, f) => s + f.balance, 0);
      notifications.push({
        _id: 'notif-fee',
        category: 'fees',
        title: `${activeChild.feeStatus === 'overdue' ? 'Overdue' : 'Pending'} fee balance`,
        detail: `₹${total.toLocaleString('en-IN')} for ${firstName}`,
        when: 'Ongoing',
        read: false,
      });
    }
    if (activeChild.attendancePercent < 85) {
      notifications.push({
        _id: 'notif-attendance',
        category: 'important',
        title: 'Attendance below 85%',
        detail: `${firstName} is at ${activeChild.attendancePercent}% this year`,
        when: 'This term',
        read: false,
      });
    }
    for (const e of upcoming.slice(0, 3)) {
      notifications.push({
        _id: `notif-event-${e._id}`,
        category: e.eventType === 'ptm' ? 'important' : 'school',
        title: e.title,
        detail: formatEventWhen(e),
        when: formatEventWhen(e),
        read: true,
      });
    }
    if (weakest && weakest.trend === 'down') {
      notifications.push({
        _id: 'notif-academic',
        category: 'academic',
        title: `${weakest.subject} needs attention`,
        detail: `${firstName} is at ${weakest.percent}% — trending down`,
        when: 'Recent',
        read: true,
      });
    }

    return {
      parent: { _id: ctx.userId, name: ctx.displayName },
      children,
      schedule,
      subjects,
      attention,
      updates,
      insight,
      notifications,
    };
  },

  /** Rule-based Q&A over the same real data the dashboard renders — not a
   *  call to an LLM. Kept intentionally simple; swap the body for a real
   *  model call later without touching the route or the frontend contract. */
  async askAI(ctx: AuthContext, childId: string, question: string): Promise<string> {
    const bundle = await this.getWorkspace(ctx, childId);
    const child = bundle.children.find((c) => c._id === childId) ?? bundle.children[0];
    if (!child) throw new NotFoundError('Child');

    const q = question.toLowerCase();
    if (q.includes('attend')) {
      return `${child.name} has attended ${child.attendancePercent}% of school days this year.`;
    }
    if (q.includes('academ') || q.includes('doing') || q.includes('progress')) {
      return `${child.name}'s current academic average is ${child.academicAverage}/10. ${bundle.insight.headline}`;
    }
    if (q.includes('help') || q.includes('weak') || q.includes('practice') || q.includes('subject')) {
      if (bundle.subjects.length === 0) return `No published subject marks for ${child.name} yet.`;
      const weakest = [...bundle.subjects].sort((a, b) => a.percent - b.percent)[0];
      return `${weakest.subject} could use the most attention right now (${weakest.percent}%).`;
    }
    if (q.includes('ptm') || q.includes('meeting') || q.includes('event') || q.includes('upcoming')) {
      return bundle.updates.length > 0
        ? bundle.updates.map((u) => `${u.title} — ${u.when}`).join('. ')
        : `Nothing scheduled for ${child.name} right now.`;
    }
    return `${bundle.insight.headline} ${bundle.insight.recommendation}`;
  },
};
