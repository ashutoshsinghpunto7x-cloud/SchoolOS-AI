import { AcademicPlan } from '../academic-plan/academic-plan.model';
import { Teacher } from '../teachers/teacher.model';
import { Exam } from '../exams/exam.model';
import { Marks } from '../marks/marks.model';
import { MockTest } from '../mock-tests/mock-test.model';
import { Visitor } from '../visitors/visitor.model';
import { FollowUp } from '../follow-ups/follow-up.model';
import { Enquiry } from '../enquiries/enquiry.model';
import { AdmissionForm } from '../admission-forms/admission-form.model';
import { Interview } from '../interviews/interview.model';
import { Candidate } from '../candidates/candidate.model';
import { FacilityRequest } from '../facility-requests/facility-request.model';
import { PurchaseRequest } from '../purchases/purchase-request.model';
import { ExpenseRecord } from '../expenses/expense.model';
import { SchoolEvent } from '../events/event.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { classNameVariants } from '../../lib/class-name';
import { AuthContext } from '../../lib/auth-context';
import { extractQueryParams, escapeRegex, addDaysISO } from './query-params';

const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const startOfToday = () => new Date(`${attendanceRepository.todayString()}T00:00:00`);

// ── Academics ────────────────────────────────────────────────────────────────

async function getSyllabusProgress(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const query: Record<string, unknown> = { schoolId: ctx.schoolId };
  if (p.className) query.class = { $in: classNameVariants(p.className) };
  if (p.subject) query.subject = new RegExp(escapeRegex(p.subject), 'i');

  const plans = await AcademicPlan.find(query)
    .select('teacherId class section subject days.date days.blockType days.status days.chapterName')
    .lean<{ teacherId: string; class: string; section?: string; subject: string;
      days: { date: Date; blockType: string; status: string; chapterName?: string }[] }[]>();
  const teachers = await Teacher.find({ _id: { $in: [...new Set(plans.map((x) => x.teacherId))] }, schoolId: ctx.schoolId })
    .select('fullName').lean<{ _id: unknown; fullName: string }[]>();
  const tName = new Map(teachers.map((t) => [String(t._id), t.fullName]));
  const teacherFilter = p.teacherName?.toLowerCase();
  const now = startOfToday();

  const rows = plans
    .map((plan) => {
      const teach = plan.days.filter((d) => d.blockType === 'teach');
      const done = teach.filter((d) => d.status === 'completed').length;
      const behind = teach.filter((d) => d.date < now && d.status !== 'completed');
      return {
        teacher: tName.get(plan.teacherId) ?? 'Unknown',
        class: `${plan.class}${plan.section ?? ''}`, subject: plan.subject,
        teachingDays: teach.length, completedDays: done,
        progressPercent: teach.length ? Math.round((done / teach.length) * 100) : 0,
        behindDays: behind.length,
        chaptersBehind: [...new Set(behind.map((d) => d.chapterName).filter(Boolean))].slice(0, 6),
      };
    })
    .filter((r) => !teacherFilter || r.teacher.toLowerCase().includes(teacherFilter))
    .sort((a, b) => b.behindDays - a.behindDays);

  return {
    filter: { class: p.className, subject: p.subject, teacher: p.teacherName },
    plans: rows.length,
    mostBehindFirst: rows.slice(0, 15),
    note: rows.length ? undefined : 'No academic plans found for this filter.',
  };
}

async function getUpcomingExams(ctx: AuthContext) {
  const exams = await Exam.find({ schoolId: ctx.schoolId, isDeleted: false, startDate: { $gte: startOfToday() } })
    .sort({ startDate: 1 }).limit(15).select('name examType classesApplicable subjects startDate endDate')
    .lean<{ name: string; examType: string; classesApplicable: string[]; subjects: string[]; startDate?: Date; endDate?: Date }[]>();
  return {
    upcoming: exams.map((e) => ({
      name: e.name, type: e.examType, classes: e.classesApplicable, subjects: e.subjects,
      from: iso(e.startDate), to: iso(e.endDate),
    })),
  };
}

async function getExamsMissingMarks(ctx: AuthContext) {
  const exams = await Exam.find({ schoolId: ctx.schoolId, isDeleted: false, startDate: { $lte: new Date() } })
    .sort({ startDate: -1 }).limit(10).select('name subjects classesApplicable startDate')
    .lean<{ _id: unknown; name: string; subjects: string[]; classesApplicable: string[]; startDate?: Date }[]>();
  const out = [];
  for (const e of exams) {
    const entered = await Marks.distinct('subjectName', { schoolId: ctx.schoolId, examId: String(e._id), isDeleted: false });
    const have = new Set((entered as string[]).map((s) => s.toLowerCase()));
    const missing = e.subjects.filter((s) => !have.has(s.toLowerCase()));
    if (missing.length) out.push({ exam: e.name, started: iso(e.startDate), classes: e.classesApplicable, subjectsWithNoMarksAtAll: missing });
  }
  return { examsWithGaps: out.length, exams: out };
}

async function getPendingApprovals(ctx: AuthContext) {
  const tests = await MockTest.find({ schoolId: ctx.schoolId, status: 'pending_approval' }).sort({ createdAt: 1 }).limit(20)
    .select('title class subject createdAt').lean<{ title: string; class: string; subject: string; createdAt: Date }[]>();
  return {
    mockTestsAwaitingApproval: tests.map((t) => ({ title: t.title, class: t.class, subject: t.subject, submittedOn: iso(t.createdAt) })),
  };
}

// ── Front office & admissions ────────────────────────────────────────────────

async function getVisitorsToday(ctx: AuthContext) {
  const visitors = await Visitor.find({ schoolId: ctx.schoolId, isDeleted: false, checkInTime: { $gte: startOfToday() } })
    .sort({ checkInTime: -1 }).limit(60)
    .select('name purpose personToVisit status checkInTime checkOutTime')
    .lean<{ name: string; purpose: string; personToVisit: string; status: string; checkInTime: Date; checkOutTime?: Date }[]>();
  const byStatus: Record<string, number> = {};
  visitors.forEach((v) => { byStatus[v.status] = (byStatus[v.status] ?? 0) + 1; });
  return {
    date: attendanceRepository.todayString(), total: visitors.length, byStatus,
    waitingNow: visitors.filter((v) => v.status === 'waiting').map((v) => v.name),
    visitors: visitors.slice(0, 25).map((v) => ({ name: v.name, purpose: v.purpose, toMeet: v.personToVisit, status: v.status })),
  };
}

async function getPendingFollowUps(ctx: AuthContext) {
  const end = new Date(`${attendanceRepository.todayString()}T23:59:59`);
  const followUps = await FollowUp.find({ schoolId: ctx.schoolId, isDeleted: false, status: { $in: ['pending', 'missed'] }, dueDate: { $lte: end } })
    .sort({ dueDate: 1 }).limit(30).select('enquiryId dueDate status channel')
    .lean<{ enquiryId: string; dueDate: Date; status: string; channel: string }[]>();
  const enquiries = await Enquiry.find({ _id: { $in: followUps.map((f) => f.enquiryId) }, schoolId: ctx.schoolId })
    .select('studentName parentName').lean<{ _id: unknown; studentName: string; parentName: string }[]>();
  const eq = new Map(enquiries.map((e) => [String(e._id), e]));
  return {
    dueOrOverdue: followUps.length,
    missed: followUps.filter((f) => f.status === 'missed').length,
    followUps: followUps.map((f) => ({
      student: eq.get(f.enquiryId)?.studentName, parent: eq.get(f.enquiryId)?.parentName,
      due: iso(f.dueDate), status: f.status, via: f.channel,
    })),
  };
}

async function getPendingAdmissionForms(ctx: AuthContext) {
  const forms = await AdmissionForm.find({
    schoolId: ctx.schoolId, isDeleted: false, verificationStatus: { $in: ['not_submitted', 'pending_verification'] },
  }).sort({ dateIssued: 1 }).limit(40).select('enquiryId formNumber verificationStatus paymentStatus dateIssued')
    .lean<{ enquiryId: string; formNumber: string; verificationStatus: string; paymentStatus: string; dateIssued: Date }[]>();
  const enquiries = await Enquiry.find({ _id: { $in: forms.map((f) => f.enquiryId) }, schoolId: ctx.schoolId })
    .select('studentName').lean<{ _id: unknown; studentName: string }[]>();
  const eq = new Map(enquiries.map((e) => [String(e._id), e.studentName]));
  return {
    pendingCount: forms.length,
    awaitingVerification: forms.filter((f) => f.verificationStatus === 'pending_verification').length,
    notYetSubmitted: forms.filter((f) => f.verificationStatus === 'not_submitted').length,
    forms: forms.map((f) => ({ student: eq.get(f.enquiryId), formNumber: f.formNumber, status: f.verificationStatus, issued: iso(f.dateIssued) })),
  };
}

async function getInterviews(ctx: AuthContext) {
  const upcoming = await Interview.find({ schoolId: ctx.schoolId, isDeleted: false, status: { $in: ['scheduled', 'rescheduled'] }, scheduledAt: { $gte: new Date() } })
    .sort({ scheduledAt: 1 }).limit(20).select('candidateId scheduledAt mode round interviewerNames')
    .lean<{ candidateId: string; scheduledAt: Date; mode: string; round: number; interviewerNames: string[] }[]>();
  const cands = await Candidate.find({ _id: { $in: upcoming.map((i) => i.candidateId) }, schoolId: ctx.schoolId })
    .select('name positionApplied').lean<{ _id: unknown; name: string; positionApplied: string }[]>();
  const cm = new Map(cands.map((c) => [String(c._id), c]));
  return {
    upcomingCount: upcoming.length,
    interviews: upcoming.map((i) => ({
      candidate: cm.get(i.candidateId)?.name, position: cm.get(i.candidateId)?.positionApplied,
      at: i.scheduledAt.toISOString(), mode: i.mode, round: i.round, interviewers: i.interviewerNames,
    })),
  };
}

async function getHiringPositions(ctx: AuthContext) {
  const agg = await Candidate.aggregate<{ _id: string; total: number; new: number; interviewing: number; selected: number }>([
    { $match: { schoolId: ctx.schoolId, isDeleted: false, status: { $ne: 'rejected' } } },
    { $group: {
      _id: '$positionApplied', total: { $sum: 1 },
      new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
      interviewing: { $sum: { $cond: [{ $in: ['$status', ['interview_scheduled', 'interview_completed']] }, 1, 0] } },
      selected: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } },
    } },
    { $sort: { total: -1 } },
  ]);
  return {
    note: 'The system tracks candidates per position, not job openings; these are positions with active candidates.',
    positions: agg.map((a) => ({ position: a._id, activeCandidates: a.total, newlyReceived: a.new, inInterview: a.interviewing, selected: a.selected })),
  };
}

// ── Operations ───────────────────────────────────────────────────────────────

async function getOpenMaintenance(ctx: AuthContext) {
  const reqs = await FacilityRequest.find({ schoolId: ctx.schoolId, isDeleted: false, status: { $in: ['open', 'assigned', 'in_progress'] } })
    .sort({ createdAt: 1 }).limit(30).select('ticketNo issueType priority location status assignedToName createdAt')
    .lean<{ ticketNo: string; issueType: string; priority: string; location: string; status: string; assignedToName?: string; createdAt: Date }[]>();
  return {
    openCount: reqs.length, urgent: reqs.filter((r) => r.priority === 'urgent' || r.priority === 'high').length,
    requests: reqs.map((r) => ({ ticket: r.ticketNo, issue: r.issueType, priority: r.priority, where: r.location, status: r.status, assignedTo: r.assignedToName, raised: iso(r.createdAt) })),
  };
}

async function getPendingPurchasesAndExpenses(ctx: AuthContext) {
  const [purchases, expenses] = await Promise.all([
    PurchaseRequest.find({ schoolId: ctx.schoolId, isDeleted: false, status: 'pending' }).sort({ createdAt: 1 }).limit(25)
      .select('requestNo raisedByName category items createdAt')
      .lean<{ requestNo: string; raisedByName: string; category: string; items: { name: string; estimatedCost?: number; quantity: number }[]; createdAt: Date }[]>(),
    ExpenseRecord.find({ schoolId: ctx.schoolId, isDeleted: false, status: 'pending' }).sort({ date: 1 }).limit(25)
      .select('title category amount date').lean<{ title: string; category: string; amount: number; date: Date }[]>(),
  ]);
  return {
    pendingPurchaseRequests: purchases.map((p) => ({
      requestNo: p.requestNo, by: p.raisedByName, category: p.category,
      items: p.items.map((i) => `${i.quantity} × ${i.name}`),
      estimatedTotal: p.items.reduce((s, i) => s + (i.estimatedCost ?? 0) * i.quantity, 0),
    })),
    pendingExpenses: expenses.map((e) => ({ title: e.title, category: e.category, amount: e.amount, date: iso(e.date) })),
    pendingExpensesTotal: expenses.reduce((s, e) => s + e.amount, 0),
  };
}

async function getUpcomingEvents(ctx: AuthContext) {
  const events = await SchoolEvent.find({
    schoolId: ctx.schoolId, isDeleted: false, status: { $in: ['scheduled', 'published'] },
    endDate: { $gte: startOfToday(), $lte: new Date(`${addDaysISO(attendanceRepository.todayString(), 60)}T00:00:00`) },
  }).sort({ startDate: 1 }).limit(20).select('title eventType startDate endDate startTime location')
    .lean<{ title: string; eventType: string; startDate: Date; endDate: Date; startTime?: string; location?: string }[]>();
  return {
    next60Days: events.map((e) => ({ title: e.title, type: e.eventType, from: iso(e.startDate), to: iso(e.endDate), time: e.startTime, where: e.location })),
  };
}

export const opsAssistantData = {
  getSyllabusProgress, getUpcomingExams, getExamsMissingMarks, getPendingApprovals,
  getVisitorsToday, getPendingFollowUps, getPendingAdmissionForms, getInterviews, getHiringPositions,
  getOpenMaintenance, getPendingPurchasesAndExpenses, getUpcomingEvents,
};
