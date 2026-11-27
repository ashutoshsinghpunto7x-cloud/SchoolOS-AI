import { Student } from '../students/student.model';
import { Teacher } from '../teachers/teacher.model';
import { Marks } from '../marks/marks.model';
import { Exam } from '../exams/exam.model';
import { Attendance } from '../attendance/attendance.model';
import { FeeRecord } from '../fees/fee.model';
import { FeePayment } from '../fees/fee.payment.model';
import { Timetable } from '../timetable/timetable.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { classNameVariants } from '../../lib/class-name';
import { AuthContext } from '../../lib/auth-context';
import { QueryParams, extractQueryParams, escapeRegex, addDaysISO, clampLimit } from './query-params';

// ── Students, marks/results and fee lists ────────────────────────────────────
// Every function resolves its own filters from the Principal's message (class,
// section, subject, exam, count, threshold), does all the maths here, and hands
// the LLM a small JSON to phrase. Lists are capped so a school-wide question
// never floods the reply.

const r1 = (n: number) => Math.round(n * 10) / 10;

interface MarkRow {
  studentId: string; examId: string; class: string; section: string;
  subjectName: string; percentage?: number; total?: number; result: string;
}

async function loadMarks(ctx: AuthContext, p: QueryParams): Promise<{ rows: MarkRow[]; examName: Map<string, string> }> {
  const examFilter: Record<string, unknown> = { schoolId: ctx.schoolId, isDeleted: false };
  if (p.exam) examFilter.name = new RegExp(escapeRegex(p.exam), 'i');
  const exams = await Exam.find(examFilter).select('name').lean<{ _id: unknown; name: string }[]>();
  const examName = new Map(exams.map((e) => [String(e._id), e.name]));
  if (!exams.length) return { rows: [], examName };

  const query: Record<string, unknown> = {
    schoolId: ctx.schoolId, isDeleted: false, examId: { $in: [...examName.keys()] }, percentage: { $exists: true },
  };
  if (p.className) query.class = { $in: classNameVariants(p.className) };
  if (p.section) query.section = p.section;
  if (p.subject) query.subjectName = new RegExp(escapeRegex(p.subject), 'i');

  const rows = await Marks.find(query)
    .select('studentId examId class section subjectName percentage total result')
    .limit(60000)
    .lean<MarkRow[]>();
  return { rows, examName };
}

async function studentNames(ctx: AuthContext, ids: string[]): Promise<Map<string, { name: string; class: string; section: string }>> {
  if (!ids.length) return new Map();
  const students = await Student.find({ _id: { $in: ids }, schoolId: ctx.schoolId })
    .select('fullName class section')
    .lean<{ _id: unknown; fullName: string; class: string; section: string }[]>();
  return new Map(students.map((s) => [String(s._id), { name: s.fullName, class: s.class, section: s.section }]));
}

// ── Top / bottom students ────────────────────────────────────────────────────

async function getRankedStudents(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const { rows } = await loadMarks(ctx, p);
  const limit = clampLimit(p.limit, 5, 25);
  const bottom = p.order === 'bottom';

  const byStudent = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const e = byStudent.get(r.studentId) ?? { sum: 0, n: 0 };
    e.sum += r.percentage ?? 0;
    e.n += 1;
    byStudent.set(r.studentId, e);
  }
  const ranked = [...byStudent.entries()]
    .map(([id, e]) => ({ id, avg: e.sum / e.n, subjects: e.n }))
    .sort((a, b) => (bottom ? a.avg - b.avg : b.avg - a.avg))
    .slice(0, limit);
  const names = await studentNames(ctx, ranked.map((r) => r.id));

  return {
    filter: { class: p.className, section: p.section, subject: p.subject, exam: p.exam },
    ranking: bottom ? 'lowest' : 'highest',
    studentsWithMarks: byStudent.size,
    students: ranked.map((r, i) => ({
      rank: i + 1,
      name: names.get(r.id)?.name ?? 'Unknown',
      class: names.get(r.id)?.class,
      section: names.get(r.id)?.section,
      averagePercent: r1(r.avg),
      subjectsCounted: r.subjects,
    })),
    note: rows.length ? undefined : 'No marks found for this filter.',
  };
}

// ── Students who failed ──────────────────────────────────────────────────────

async function getFailedStudents(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const { rows, examName } = await loadMarks(ctx, p);
  const failed = rows.filter((r) => r.result === 'fail');
  const names = await studentNames(ctx, [...new Set(failed.map((r) => r.studentId))].slice(0, 200));
  const limit = clampLimit(p.limit, 30, 60);

  return {
    filter: { class: p.className, section: p.section, subject: p.subject, exam: p.exam },
    failedEntries: failed.length,
    distinctStudents: new Set(failed.map((r) => r.studentId)).size,
    students: failed
      .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))
      .slice(0, limit)
      .map((r) => ({
        name: names.get(r.studentId)?.name ?? 'Unknown',
        class: r.class, section: r.section, subject: r.subjectName,
        exam: examName.get(r.examId), percent: r.percentage, marks: r.total,
      })),
  };
}

// ── Results analysis: averages, pass %, worst subject, exam comparison, teacher ─

interface Agg { sum: number; n: number; passed: number; counted: number }
const bump = (m: Map<string, Agg>, key: string, r: MarkRow) => {
  const a = m.get(key) ?? { sum: 0, n: 0, passed: 0, counted: 0 };
  a.sum += r.percentage ?? 0; a.n += 1;
  if (r.result === 'pass' || r.result === 'fail') { a.counted += 1; if (r.result === 'pass') a.passed += 1; }
  m.set(key, a);
};
const summarise = (m: Map<string, Agg>) =>
  [...m.entries()].map(([key, a]) => ({
    key, averagePercent: r1(a.sum / a.n), passPercent: a.counted ? r1((a.passed / a.counted) * 100) : null, entries: a.n,
  }));

async function getResultsAnalysis(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const compare = p.secondExam
    ? await Promise.all([loadMarks(ctx, p), loadMarks(ctx, { ...p, exam: p.secondExam })])
    : null;
  const { rows, examName } = compare ? compare[0] : await loadMarks(ctx, p);

  const bySubject = new Map<string, Agg>();
  const byClass = new Map<string, Agg>();
  const byExam = new Map<string, Agg>();
  for (const r of rows) {
    bump(bySubject, r.subjectName, r);
    bump(byClass, `${r.class}-${r.section}`, r);
    bump(byExam, examName.get(r.examId) ?? 'Exam', r);
  }
  if (compare) {
    for (const r of compare[1].rows) bump(byExam, compare[1].examName.get(r.examId) ?? 'Exam', r);
  }

  // Teacher → subject results: join to the published timetable (class+section+subject → teacher).
  const timetables = await Timetable.find({ schoolId: ctx.schoolId, isDeleted: false, status: 'published' })
    .select('class section entries.subjectName entries.teacherName')
    .lean<{ class: string; section: string; entries: { subjectName: string; teacherName?: string }[] }[]>();
  const teacherOf = new Map<string, string>();
  for (const t of timetables) {
    for (const e of t.entries) {
      if (e.teacherName) teacherOf.set(`${t.class}|${t.section}|${e.subjectName.toLowerCase()}`, e.teacherName);
    }
  }
  const byTeacher = new Map<string, Agg>();
  for (const r of rows) {
    const teacher = teacherOf.get(`${r.class}|${r.section}|${r.subjectName.toLowerCase()}`);
    if (teacher) bump(byTeacher, `${teacher} (${r.subjectName})`, r);
  }

  const bySubj = summarise(bySubject).sort((a, b) => a.averagePercent - b.averagePercent);
  return {
    filter: { class: p.className, section: p.section, subject: p.subject, exam: p.exam, compareWith: p.secondExam },
    overall: rows.length ? summarise(new Map([['all', rows.reduce<Agg>((a, r) => {
      a.sum += r.percentage ?? 0; a.n += 1;
      if (r.result === 'pass' || r.result === 'fail') { a.counted += 1; if (r.result === 'pass') a.passed += 1; }
      return a;
    }, { sum: 0, n: 0, passed: 0, counted: 0 })]]))[0] : null,
    subjectsWeakestFirst: bySubj.slice(0, 12),
    classes: summarise(byClass).sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })).slice(0, 40),
    exams: summarise(byExam),
    teachersLowestFirst: summarise(byTeacher).sort((a, b) => a.averagePercent - b.averagePercent).slice(0, 10),
    note: rows.length ? undefined : 'No marks found for this filter.',
  };
}

// ── Low attendance ───────────────────────────────────────────────────────────

async function getLowAttendanceStudents(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const threshold = p.threshold ?? 75;
  const since = addDaysISO(attendanceRepository.todayString(), -30);
  const match: Record<string, unknown> = { schoolId: ctx.schoolId, isDeleted: false, date: { $gte: since } };
  if (p.className) match.class = { $in: classNameVariants(p.className) };
  if (p.section) match.section = p.section;

  const agg = await Attendance.aggregate<{ _id: string; total: number; present: number; cls: string; sec: string }>([
    { $match: match },
    { $group: {
      _id: '$studentId', cls: { $first: '$class' }, sec: { $first: '$section' }, total: { $sum: 1 },
      present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'half_day']] }, 1, 0] } },
    } },
  ]);
  const low = agg
    .map((a) => ({ ...a, pct: (a.present / a.total) * 100 }))
    .filter((a) => a.pct < threshold)
    .sort((a, b) => a.pct - b.pct);
  const shown = low.slice(0, clampLimit(p.limit, 30, 60));
  const names = await studentNames(ctx, shown.map((s) => s._id));

  return {
    windowDays: 30, thresholdPercent: threshold, classFilter: p.className ? `${p.className}${p.section ?? ''}` : null,
    studentsBelowThreshold: low.length,
    students: shown.map((s) => ({
      name: names.get(s._id)?.name ?? 'Unknown', class: s.cls, section: s.sec,
      attendancePercent: r1(s.pct), daysMarked: s.total, daysAbsent: s.total - s.present,
    })),
  };
}

// ── Fee defaulters, overdue by class, collection by period ───────────────────

async function getFeeDefaulters(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const match: Record<string, unknown> = { schoolId: ctx.schoolId, isDeleted: false, balance: { $gt: 0 } };
  if (p.className) match.class = { $in: classNameVariants(p.className) };
  if (p.section) match.section = p.section;

  const now = new Date();
  const [byStudent, overdueByClass] = await Promise.all([
    FeeRecord.aggregate<{ _id: string; name: string; cls: string; sec: string; owed: number; overdue: number }>([
      { $match: match },
      { $group: {
        _id: '$studentId', name: { $first: '$studentName' }, cls: { $first: '$class' }, sec: { $first: '$section' },
        owed: { $sum: '$balance' },
        overdue: { $sum: { $cond: [{ $or: [{ $eq: ['$status', 'overdue'] }, { $lt: ['$dueDate', now] }] }, '$balance', 0] } },
      } },
      { $sort: { owed: -1 } },
    ]),
    FeeRecord.aggregate<{ _id: { c: string; s: string }; overdue: number; students: string[] }>([
      { $match: { ...match, $or: [{ status: 'overdue' }, { dueDate: { $lt: now } }] } },
      { $group: { _id: { c: '$class', s: '$section' }, overdue: { $sum: '$balance' }, students: { $addToSet: '$studentId' } } },
      { $sort: { overdue: -1 } },
    ]),
  ]);

  return {
    classFilter: p.className ? `${p.className}${p.section ?? ''}` : null,
    defaulterCount: byStudent.length,
    totalOutstanding: byStudent.reduce((s, x) => s + x.owed, 0),
    defaulters: byStudent.slice(0, clampLimit(p.limit, 25, 60)).map((d) => ({
      name: d.name, class: d.cls, section: d.sec, outstanding: d.owed, ofWhichOverdue: d.overdue,
    })),
    overdueByClass: overdueByClass.slice(0, 20).map((o) => ({
      class: o._id.c, section: o._id.s, overdueAmount: o.overdue, students: o.students.length,
    })),
  };
}

async function getFeeCollectionByPeriod(ctx: AuthContext) {
  const today = attendanceRepository.todayString();
  const startOfToday = new Date(`${today}T00:00:00`);
  const startOfMonth = new Date(`${today.slice(0, 8)}01T00:00:00`);
  const sum = async (from: Date) => {
    const r = await FeePayment.aggregate<{ total: number; count: number }>([
      { $match: { schoolId: ctx.schoolId, isDeleted: false, paymentDate: { $gte: from } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    return { amount: r[0]?.total ?? 0, payments: r[0]?.count ?? 0 };
  };
  const [todayTotals, monthTotals] = await Promise.all([sum(startOfToday), sum(startOfMonth)]);
  return { date: today, collectedToday: todayTotals, collectedThisMonth: monthTotals };
}

// ── Class strength / roster, birthdays ───────────────────────────────────────

async function getClassRoster(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const base: Record<string, unknown> = { schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ['active', 'enrolled'] } };

  if (!p.className) {
    const counts = await Student.aggregate<{ _id: { c: string; s: string }; n: number }>([
      { $match: base },
      { $group: { _id: { c: '$class', s: '$section' }, n: { $sum: 1 } } },
    ]);
    const sorted = counts.sort((a, b) => a._id.c.localeCompare(b._id.c, undefined, { numeric: true }) || a._id.s.localeCompare(b._id.s));
    return {
      totalStudents: counts.reduce((s, c) => s + c.n, 0),
      classes: sorted.map((c) => ({ class: c._id.c, section: c._id.s, students: c.n })),
    };
  }

  base.class = { $in: classNameVariants(p.className) };
  if (p.section) base.section = p.section;
  const students = await Student.find(base)
    .sort({ section: 1, rosterOrder: 1, fullName: 1 })
    .select('fullName class section rollNumber')
    .lean<{ fullName: string; class: string; section: string; rollNumber?: string }[]>();
  const sections = new Map<string, number>();
  students.forEach((s) => sections.set(s.section, (sections.get(s.section) ?? 0) + 1));
  return {
    classFilter: `${p.className}${p.section ?? ''}`,
    strength: students.length,
    perSection: [...sections.entries()].map(([section, n]) => ({ section, students: n })),
    students: students.slice(0, 60).map((s) => ({ name: s.fullName, section: s.section, rollNumber: s.rollNumber })),
    note: students.length > 60 ? `Showing the first 60 of ${students.length}.` : undefined,
  };
}

async function getBirthdays(ctx: AuthContext) {
  const today = attendanceRepository.todayString();
  const [, m, d] = today.split('-').map(Number);
  const [students, teachers] = await Promise.all([
    Student.aggregate<{ fullName: string; class: string; section: string }>([
      { $match: { schoolId: ctx.schoolId, isDeleted: false, dateOfBirth: { $exists: true } } },
      { $match: { $expr: { $and: [{ $eq: [{ $month: '$dateOfBirth' }, m] }, { $eq: [{ $dayOfMonth: '$dateOfBirth' }, d] }] } } },
      { $project: { fullName: 1, class: 1, section: 1 } },
      { $limit: 60 },
    ]),
    Teacher.aggregate<{ fullName: string }>([
      { $match: { schoolId: ctx.schoolId, isDeleted: false, dateOfBirth: { $exists: true } } },
      { $match: { $expr: { $and: [{ $eq: [{ $month: '$dateOfBirth' }, m] }, { $eq: [{ $dayOfMonth: '$dateOfBirth' }, d] }] } } },
      { $project: { fullName: 1 } },
    ]).catch(() => [] as { fullName: string }[]),
  ]);
  return {
    date: today,
    studentBirthdays: students.map((s) => ({ name: s.fullName, class: s.class, section: s.section })),
    teacherBirthdays: teachers.map((t) => t.fullName),
  };
}

export const studentsAssistantData = {
  getRankedStudents, getFailedStudents, getResultsAnalysis, getLowAttendanceStudents,
  getFeeDefaulters, getFeeCollectionByPeriod, getClassRoster, getBirthdays,
};
