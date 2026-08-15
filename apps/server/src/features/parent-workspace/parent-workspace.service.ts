import QRCode from 'qrcode';
import { User } from '../users/user.model';
import { studentRepository } from '../students/student.repository';
import { attendanceRepository } from '../attendance/attendance.repository';
import { feeRepository } from '../fees/fee.repository';
import { marksRepository } from '../marks/marks.repository';
import { examRepository } from '../exams/exam.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { periodSlotRepository } from '../timetable/timetable.period.repository';
import { eventRepository } from '../events/event.repository';
import { termReportCardRepository } from '../term-report-cards/term-report-card.repository';
import { reportCardTemplateRepository } from '../report-card-templates/report-card-template.repository';
import { schoolSettingsService } from '../school-settings/school-settings.service';
import { env } from '../../config/env';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import type { IStudent } from '../students/student.model';
import type { ISchoolEvent } from '../events/event.model';
import type { AttendanceStatus } from '../attendance/attendance.model';
import type { FeeHead, FeeStatus } from '../fees/fee.model';
import type { ITermReportCard } from '../term-report-cards/term-report-card.model';
import type { IReportCardTemplate } from '../report-card-templates/report-card-template.model';
import type { ISchoolSettings } from '../school-settings/school-settings.model';

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

// ── Academics ────────────────────────────────────────────────────────────────

export interface ExamSubjectResult {
  subject: string;
  total?: number;
  percentage?: number;
  grade?: string;
  result: 'pass' | 'fail' | 'na';
  remark?: string;
}

export interface ExamResult {
  examId: string;
  examName: string;
  examType: string;
  termLabel?: string;
  subjects: ExamSubjectResult[];
  overallPercentage?: number;
}

export interface AcademicsBundle {
  child: { _id: string; name: string; grade: string; section: string };
  exams: ExamResult[];
  subjectTrend: SubjectSnapshot[];
}

// ── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecordView {
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceBundle {
  child: { _id: string; name: string; grade: string; section: string };
  month: string; // "YYYY-MM"
  records: AttendanceRecordView[];
  monthSummary: { total: number; present: number; absent: number; late: number; attendanceRate: number };
  yearSummary: { total: number; present: number; absent: number; late: number; attendanceRate: number };
}

// ── Fees ─────────────────────────────────────────────────────────────────────

export interface FeeRecordView {
  _id: string;
  feeHead: FeeHead;
  customHead?: string;
  description?: string;
  academicYear: string;
  month?: string;
  totalAmount: number;
  discountAmount: number;
  waivedAmount: number;
  fineAmount: number;
  paidAmount: number;
  balance: number;
  status: FeeStatus;
  dueDate: string;
}

export interface FeesBundle {
  child: { _id: string; name: string; grade: string; section: string };
  totalCharged: number;
  totalPaid: number;
  totalOutstanding: number;
  records: FeeRecordView[];
}

// ── Term Report Card ─────────────────────────────────────────────────────────

/** Just the student fields the report-card document needs to render — not
 *  the full student record (no fee/medical/contact info a parent doesn't
 *  need for this view). */
export interface ReportCardStudentView {
  _id: string;
  fullName: string;
  admissionNumber: string;
  rollNumber?: string;
  class: string;
  section: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  photoUrl?: string;
}

export interface ReportCardBundle {
  available: boolean;
  reportCard?: ITermReportCard;
  template?: IReportCardTemplate;
  student?: ReportCardStudentView;
  schoolSettings?: ISchoolSettings;
  qrDataUri?: string;
}

export const parentWorkspaceService = {
  /** Which students this parent account may see. Re-read from the User
   *  document (not the JWT) so an admin re-linking a parent's children takes
   *  effect on the parent's next request, not just their next login. */
  async getLinkedStudentIds(ctx: AuthContext): Promise<string[]> {
    const user = await User.findOne({ _id: ctx.userId, schoolId: ctx.schoolId }).lean();
    return user?.linkedStudentIds ?? [];
  },

  /** Every child-scoped endpoint must go through this — a parent may only ever
   *  read data for a student on their own linkedStudentIds list. */
  async getOwnedStudent(ctx: AuthContext, childId: string): Promise<IStudent> {
    const linkedStudentIds = await this.getLinkedStudentIds(ctx);
    if (!linkedStudentIds.includes(childId)) {
      throw new ForbiddenError('You do not have access to this student');
    }
    const student = await studentRepository.findById(childId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    return student;
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

  /** Exam-wise marks, grouped, for the child's full academic record —
   *  published results only (nothing still in a school-internal workflow
   *  state is parent-visible). */
  async getAcademics(ctx: AuthContext, childId: string): Promise<AcademicsBundle> {
    const student = await this.getOwnedStudent(ctx, childId);

    const marksResult = await marksRepository.findAll(ctx.schoolId, {
      studentId: childId,
      workflowStatus: 'published',
      limit: 500,
    });

    const examIds = Array.from(new Set(marksResult.records.map((m) => m.examId)));
    const exams = (await Promise.all(examIds.map((id) => examRepository.findById(id, ctx.schoolId))))
      .filter((e): e is NonNullable<typeof e> => !!e);
    const examById = new Map(exams.map((e) => [e._id.toString(), e]));

    const byExam = new Map<string, typeof marksResult.records>();
    for (const m of marksResult.records) {
      const list = byExam.get(m.examId) ?? [];
      list.push(m);
      byExam.set(m.examId, list);
    }

    const examResults: ExamResult[] = Array.from(byExam.entries())
      .map(([examId, records]) => {
        const exam = examById.get(examId);
        const subjects: ExamSubjectResult[] = records.map((m) => ({
          subject: m.subjectName,
          total: m.total,
          percentage: m.percentage,
          grade: m.grade,
          result: m.result,
          remark: m.remark,
        }));
        const scored = subjects.filter((s) => typeof s.percentage === 'number');
        const overallPercentage = scored.length > 0
          ? Math.round((scored.reduce((s, x) => s + (x.percentage ?? 0), 0) / scored.length) * 10) / 10
          : undefined;
        return {
          examId,
          examName: exam?.name ?? 'Exam',
          examType: exam?.examType ?? 'other',
          termLabel: exam?.termLabel,
          subjects,
          overallPercentage,
        };
      })
      // Most recent first — approximated by exam creation order via ObjectId.
      .sort((a, b) => (a.examId < b.examId ? 1 : -1));

    // Reuse the same subject-trend logic as the dashboard snapshot.
    const bySubject = new Map<string, typeof marksResult.records>();
    for (const m of marksResult.records) {
      if (typeof m.percentage !== 'number') continue;
      const list = bySubject.get(m.subjectName) ?? [];
      list.push(m);
      bySubject.set(m.subjectName, list);
    }
    const subjectTrend: SubjectSnapshot[] = Array.from(bySubject.entries()).map(([subjectName, records], i) => {
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

    return {
      child: { _id: childId, name: student.fullName, grade: student.class, section: student.section },
      exams: examResults,
      subjectTrend,
    };
  },

  /** One calendar month of attendance plus the running year summary, for the
   *  Attendance screen's month-by-month view. */
  async getAttendance(ctx: AuthContext, childId: string, month?: string): Promise<AttendanceBundle> {
    const student = await this.getOwnedStudent(ctx, childId);

    const now = new Date();
    const targetMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = targetMonth.split('-').map(Number);
    const monthStart = `${targetMonth}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${targetMonth}-${String(lastDay).padStart(2, '0')}`;
    const yearStart = `${y}-01-01`;
    const yearEnd = `${y}-12-31`;

    const [monthResult, monthSummary, yearSummary] = await Promise.all([
      attendanceRepository.findByStudent(ctx.schoolId, childId, { page: 1, limit: 31, dateFrom: monthStart, dateTo: monthEnd }),
      attendanceRepository.getSummary(ctx.schoolId, { studentId: childId, dateFrom: monthStart, dateTo: monthEnd }),
      attendanceRepository.getSummary(ctx.schoolId, { studentId: childId, dateFrom: yearStart, dateTo: yearEnd }),
    ]);

    const records: AttendanceRecordView[] = monthResult.records
      .map((r) => ({ date: r.date, status: r.status, note: r.note }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return {
      child: { _id: childId, name: student.fullName, grade: student.class, section: student.section },
      month: targetMonth,
      records,
      monthSummary,
      yearSummary,
    };
  },

  /** Full fee ledger for the child — every head, current academic year first. */
  async getFees(ctx: AuthContext, childId: string): Promise<FeesBundle> {
    const student = await this.getOwnedStudent(ctx, childId);

    const records = await feeRepository.findByStudent(ctx.schoolId, childId);
    const sorted = [...records].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const totalCharged = records.reduce((s, f) => s + f.totalAmount + f.fineAmount - f.discountAmount - f.waivedAmount, 0);
    const totalPaid = records.reduce((s, f) => s + f.paidAmount, 0);
    const totalOutstanding = records.reduce((s, f) => s + f.balance, 0);

    return {
      child: { _id: childId, name: student.fullName, grade: student.class, section: student.section },
      totalCharged,
      totalPaid,
      totalOutstanding,
      records: sorted.map((f) => ({
        _id: f._id.toString(),
        feeHead: f.feeHead,
        customHead: f.customHead,
        description: f.description,
        academicYear: f.academicYear,
        month: f.month,
        totalAmount: f.totalAmount,
        discountAmount: f.discountAmount,
        waivedAmount: f.waivedAmount,
        fineAmount: f.fineAmount,
        paidAmount: f.paidAmount,
        balance: f.balance,
        status: f.status,
        dueDate: new Date(f.dueDate).toISOString(),
      })),
    };
  },

  /** The most recent *published* term report card for the child, plus
   *  everything the TermReportCardDocument component needs to render it
   *  (template, student header fields, school branding, verification QR).
   *  Draft cards are never returned here — publishing is what makes a card
   *  parent-visible, same rule the staff-facing UI already enforces. */
  async getReportCard(ctx: AuthContext, childId: string): Promise<ReportCardBundle> {
    const student = await this.getOwnedStudent(ctx, childId);

    const cardDoc = await termReportCardRepository.findLatestPublishedByStudent(ctx.schoolId, childId);
    if (!cardDoc) return { available: false };

    const reportCard = cardDoc.toObject() as ITermReportCard;

    const [template, schoolSettings] = await Promise.all([
      reportCardTemplateRepository.findByClassYear(ctx.schoolId, cardDoc.class, cardDoc.academicYear),
      schoolSettingsService.getSettings(ctx.schoolId),
    ]);

    const verifyUrl = `${env.FRONTEND_URL}/verify/term-report-card/${cardDoc.verificationToken}`;
    const qrDataUri = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

    return {
      available: true,
      reportCard,
      template: template ?? undefined,
      student: {
        _id: student._id.toString(),
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
        class: student.class,
        section: student.section,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString() : undefined,
        photoUrl: student.photoUrl,
      },
      schoolSettings,
      qrDataUri,
    };
  },
};
