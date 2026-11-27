import { BehaviorRecord } from '../behavior/behavior-record.model';
import { Student } from '../students/student.model';
import { Vehicle, StudentTransportAssignment } from '../transport/transport.model';
import { salaryService } from '../salary/salary.service';
import { ExpenseRecord } from '../expenses/expense.model';
import { InventoryItem } from '../inventory/inventory-item.model';
import { Asset } from '../assets/asset.model';
import { AcademicPlan } from '../academic-plan/academic-plan.model';
import { Teacher } from '../teachers/teacher.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { Attendance } from '../attendance/attendance.model';
import { FeePayment } from '../fees/fee.payment.model';
import { StaffAttendanceRecord } from '../staff-attendance/staff-attendance.model';
import { LeaveRequest } from '../leave-requests/leave-request.model';
import { TimetableSubstitute } from '../timetable/timetable.substitute.model';
import { AuthContext } from '../../lib/auth-context';
import { extractQueryParams, escapeRegex, addDaysISO } from './query-params';

// ── Behavior, transport, payroll, expenses, stock/assets, plan compliance ─────
// Read-only fetchers in the same shape as the other *.data.ts files: the backend
// computes every figure, the model only words the answer.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const today = () => attendanceRepository.todayString();

async function getBehaviorSummary(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  const since = addDaysISO(today(), -30);
  const match: Record<string, unknown> = { schoolId: ctx.schoolId, isDeleted: false, date: { $gte: since } };

  if (p.studentName) {
    const students = await Student.find({ schoolId: ctx.schoolId, isDeleted: false, fullName: new RegExp(escapeRegex(p.studentName), 'i') })
      .select('fullName class section').limit(5).lean<{ _id: unknown; fullName: string; class: string; section: string }[]>();
    if (!students.length) return { found: false, note: `No student matching "${p.studentName}" was found.` };
    const out = [];
    for (const s of students) {
      const recs = await BehaviorRecord.find({ ...match, studentId: String(s._id) }).sort({ date: -1 }).limit(20)
        .select('date optionLabel category note markedByName').lean<{ date: string; optionLabel: string; category: string; note?: string; markedByName: string }[]>();
      out.push({
        student: s.fullName, class: `${s.class}${s.section}`,
        positive: recs.filter((r) => r.category === 'positive').length, negative: recs.filter((r) => r.category === 'negative').length,
        records: recs.map((r) => ({ date: r.date, what: r.optionLabel, type: r.category, note: r.note, by: r.markedByName })),
      });
    }
    return { windowDays: 30, students: out };
  }

  if (p.className) match.class = p.className;
  const agg = await BehaviorRecord.aggregate<{ _id: { s: string; c: string }; n: number }>([
    { $match: match }, { $group: { _id: { s: '$studentId', c: '$category' }, n: { $sum: 1 } } },
  ]);
  const byStudent = new Map<string, { positive: number; negative: number }>();
  const totals = { positive: 0, negative: 0, neutral: 0 };
  for (const a of agg) {
    const row = byStudent.get(a._id.s) ?? { positive: 0, negative: 0 };
    if (a._id.c === 'positive') row.positive += a.n;
    if (a._id.c === 'negative') row.negative += a.n;
    byStudent.set(a._id.s, row);
    if (a._id.c in totals) totals[a._id.c as keyof typeof totals] += a.n;
  }
  const rank = (key: 'positive' | 'negative') => [...byStudent.entries()].filter(([, v]) => v[key] > 0).sort((a, b) => b[1][key] - a[1][key]).slice(0, 10);
  const ids = [...new Set([...rank('negative'), ...rank('positive')].map(([id]) => id))];
  const studs = ids.length ? await Student.find({ _id: { $in: ids }, schoolId: ctx.schoolId }).select('fullName class section').lean<{ _id: unknown; fullName: string; class: string; section: string }[]>() : [];
  const label = new Map(studs.map((s) => [String(s._id), `${s.fullName} (${s.class}${s.section})`]));
  return {
    windowDays: 30, class: p.className, totals,
    mostNegativeIncidents: rank('negative').map(([id, v]) => ({ student: label.get(id) ?? id, negative: v.negative })),
    mostPositiveRecognitions: rank('positive').map(([id, v]) => ({ student: label.get(id) ?? id, positive: v.positive })),
    note: totals.positive + totals.negative + totals.neutral === 0 ? 'No behavior records in the last 30 days.' : undefined,
  };
}

async function getTransportSummary(ctx: AuthContext) {
  const [vehicles, assignments, activeStudents] = await Promise.all([
    Vehicle.find({ schoolId: ctx.schoolId, isDeleted: false }).select('vehicleNumber routeName driverName status').lean<{ _id: unknown; vehicleNumber: string; routeName: string; driverName?: string; status: string }[]>(),
    StudentTransportAssignment.find({ schoolId: ctx.schoolId }).select('studentId vehicleId').lean<{ studentId: string; vehicleId: string }[]>(),
    Student.countDocuments({ schoolId: ctx.schoolId, isDeleted: false, admissionStatus: { $in: ['active', 'enrolled'] } }),
  ]);
  const count = new Map<string, number>();
  assignments.forEach((a) => count.set(a.vehicleId, (count.get(a.vehicleId) ?? 0) + 1));
  const using = new Set(assignments.map((a) => a.studentId)).size;
  return {
    vehicles: vehicles.length,
    studentsUsingTransport: using, activeStudents, studentsWithoutTransport: Math.max(0, activeStudents - using),
    buses: vehicles.map((v) => ({ number: v.vehicleNumber, route: v.routeName, driver: v.driverName ?? 'not assigned', status: v.status, students: count.get(String(v._id)) ?? 0 })),
    note: vehicles.length ? undefined : 'No vehicles are set up in the Transport module yet.',
  };
}

async function getPayrollSummary(ctx: AuthContext) {
  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const s = await salaryService.getSummary(ctx, month, now.getFullYear());
  return {
    month, year: now.getFullYear(),
    totalSalaryThisMonth: s.totalScheduled + s.totalPending + s.totalPaid,
    paid: { amount: s.totalPaid, staff: s.paidCount },
    pendingDue: { amount: s.totalPending, staff: s.pendingCount },
    scheduledNotYetDue: { amount: s.totalScheduled, staff: s.scheduledCount },
    note: s.paidCount + s.pendingCount + s.scheduledCount === 0 ? `No salary records exist for ${month} yet.` : undefined,
  };
}

async function getExpenseSummary(ctx: AuthContext) {
  const from = new Date(`${today().slice(0, 8)}01T00:00:00`);
  const agg = await ExpenseRecord.aggregate<{ _id: string; total: number; n: number; pending: number }>([
    { $match: { schoolId: ctx.schoolId, isDeleted: false, date: { $gte: from } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, n: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } } } },
    { $sort: { total: -1 } },
  ]);
  return {
    month: MONTHS[from.getMonth()],
    totalSpend: agg.reduce((s, a) => s + a.total, 0), entries: agg.reduce((s, a) => s + a.n, 0),
    byCategory: agg.map((a) => ({ category: a._id, amount: a.total, entries: a.n, awaitingApproval: a.pending })),
    note: agg.length ? undefined : 'No expenses have been recorded this month.',
  };
}

async function getStockAndAssets(ctx: AuthContext) {
  const soon = new Date(`${addDaysISO(today(), 60)}T00:00:00`);
  const [items, repair, expiring] = await Promise.all([
    InventoryItem.find({ schoolId: ctx.schoolId, isDeleted: false, $expr: { $lte: ['$qtyAvailable', '$minStockLevel'] } })
      .sort({ qtyAvailable: 1 }).limit(30).select('itemName category qtyAvailable minStockLevel storageLocation')
      .lean<{ itemName: string; category: string; qtyAvailable: number; minStockLevel: number; storageLocation?: string }[]>(),
    Asset.find({ schoolId: ctx.schoolId, isDeleted: false, status: 'under_repair' }).limit(30).select('assetId name location')
      .lean<{ assetId: string; name: string; location: string }[]>(),
    Asset.find({ schoolId: ctx.schoolId, isDeleted: false, status: 'active', $or: [{ warrantyExpiry: { $lte: soon } }, { amcExpiry: { $lte: soon } }] })
      .limit(30).select('assetId name warrantyExpiry amcExpiry').lean<{ assetId: string; name: string; warrantyExpiry?: Date; amcExpiry?: Date }[]>(),
  ]);
  return {
    lowStockCount: items.length,
    lowStock: items.map((i) => ({ item: i.itemName, category: i.category, left: i.qtyAvailable, minimum: i.minStockLevel, where: i.storageLocation })),
    assetsUnderRepair: repair.map((a) => ({ id: a.assetId, name: a.name, where: a.location })),
    warrantyOrAmcEndingIn60Days: expiring.map((a) => ({ id: a.assetId, name: a.name, warrantyEnds: iso(a.warrantyExpiry), amcEnds: iso(a.amcExpiry) })),
  };
}

async function getPlanCompliance(ctx: AuthContext) {
  const start = new Date(`${today()}T00:00:00`);
  const end = new Date(`${today()}T23:59:59`);
  const plans = await AcademicPlan.find({ schoolId: ctx.schoolId, 'days.date': { $gte: start, $lte: end } })
    .select('teacherId class section subject days.date days.blockType days.status')
    .lean<{ teacherId: string; class: string; section?: string; subject: string; days: { date: Date; blockType: string; status: string }[] }[]>();
  const teachers = await Teacher.find({ _id: { $in: [...new Set(plans.map((x) => x.teacherId))] }, schoolId: ctx.schoolId })
    .select('fullName').lean<{ _id: unknown; fullName: string }[]>();
  const name = new Map(teachers.map((t) => [String(t._id), t.fullName]));
  const per = new Map<string, { due: number; done: number; open: string[] }>();
  for (const pl of plans) {
    for (const d of pl.days) {
      if (d.blockType !== 'teach' || d.date < start || d.date > end) continue;
      const t = name.get(pl.teacherId) ?? 'Unknown';
      const row = per.get(t) ?? { due: 0, done: 0, open: [] };
      row.due += 1;
      if (d.status === 'completed') row.done += 1; else row.open.push(`${pl.class}${pl.section ?? ''} ${pl.subject}`);
      per.set(t, row);
    }
  }
  const rows = [...per.entries()].map(([teacher, v]) => ({ teacher, lessonsToday: v.due, ticked: v.done, notTicked: v.due - v.done, notTickedClasses: v.open }));
  return {
    date: today(), teachersWithLessons: rows.length,
    teachersNotFullyTicked: rows.filter((r) => r.notTicked > 0).sort((a, b) => b.notTicked - a.notTicked),
    teachersAllTicked: rows.filter((r) => r.notTicked === 0).map((r) => r.teacher),
    note: rows.length ? 'Ticks may still come in later in the day.' : "No teacher has a lesson planned for today in the Academic Plan.",
  };
}

// ── Trends ───────────────────────────────────────────────────────────────────

async function getAttendanceTrend(ctx: AuthContext) {
  const from = addDaysISO(today(), -13);
  const rows = await Attendance.aggregate<{ _id: { d: string; s: string }; n: number }>([
    { $match: { schoolId: ctx.schoolId, isDeleted: false, date: { $gte: from, $lte: today() } } },
    { $group: { _id: { d: '$date', s: '$status' }, n: { $sum: 1 } } },
  ]);
  const days = new Map<string, { total: number; present: number }>();
  for (const r of rows) {
    const d = days.get(r._id.d) ?? { total: 0, present: 0 };
    d.total += r.n;
    if (['present', 'late', 'half_day'].includes(r._id.s)) d.present += r.n;
    days.set(r._id.d, d);
  }
  const daily = [...days.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, percent: v.total ? Math.round((v.present / v.total) * 100) : 0, marked: v.total }));
  const avg = (xs: { percent: number }[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x.percent, 0) / xs.length) : null);
  const cut = addDaysISO(today(), -6);
  const thisWeek = daily.filter((d) => d.date >= cut);
  const lastWeek = daily.filter((d) => d.date < cut);
  const a = avg(thisWeek);
  const b = avg(lastWeek);
  return {
    daily, thisWeekAverage: a, lastWeekAverage: b, change: a !== null && b !== null ? a - b : null,
    note: daily.length ? 'Days with no attendance marked (Sundays, holidays) are missing from the list.' : 'No attendance has been marked in the last 14 days.',
  };
}

async function getFeeTrend(ctx: AuthContext) {
  const t = today();
  const thisStart = new Date(`${t.slice(0, 8)}01T00:00:00`);
  const lastStart = new Date(thisStart); lastStart.setMonth(lastStart.getMonth() - 1);
  const sum = async (from: Date, to: Date) => {
    const r = await FeePayment.aggregate<{ total: number; n: number }>([
      { $match: { schoolId: ctx.schoolId, isDeleted: false, paymentDate: { $gte: from, $lt: to } } },
      { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } },
    ]);
    return { amount: r[0]?.total ?? 0, payments: r[0]?.n ?? 0 };
  };
  const todayStart = new Date(`${t}T00:00:00`);
  const yesterdayStart = new Date(`${addDaysISO(t, -1)}T00:00:00`);
  const sameDayLast = new Date(lastStart); sameDayLast.setDate(todayStart.getDate() + 1);
  const [thisMonth, lastMonthSoFar, lastMonthFull, yesterday] = await Promise.all([
    sum(thisStart, new Date(todayStart.getTime() + 86400000)), sum(lastStart, sameDayLast), sum(lastStart, thisStart), sum(yesterdayStart, todayStart),
  ]);
  return {
    thisMonthSoFar: { month: MONTHS[thisStart.getMonth()], ...thisMonth },
    lastMonthSameDays: { month: MONTHS[lastStart.getMonth()], ...lastMonthSoFar },
    lastMonthFull: { month: MONTHS[lastStart.getMonth()], ...lastMonthFull },
    paidYesterday: yesterday,
    changeVsLastMonthSameDays: thisMonth.amount - lastMonthSoFar.amount,
  };
}

// ── Teacher profile ──────────────────────────────────────────────────────────

async function getTeacherProfile(ctx: AuthContext, message = '') {
  const p = await extractQueryParams(message, ctx);
  if (!p.teacherName) return { found: false, note: 'No teacher name was found in the question. Ask the Principal to say the teacher name.' };
  const tokens = p.teacherName.split(/\s+/).filter(Boolean).slice(0, 4);
  const teachers = await Teacher.find({ schoolId: ctx.schoolId, isDeleted: false, $and: tokens.map((t) => ({ fullName: new RegExp(escapeRegex(t), 'i') })) })
    .limit(5).select('fullName employeeId subjects assignedClasses').lean<{ _id: unknown; fullName: string; employeeId?: string; subjects?: string[]; assignedClasses?: string[] }[]>();
  if (!teachers.length) return { found: false, note: `No teacher matching "${p.teacherName}" was found.` };
  const since = addDaysISO(today(), -30);
  const out = [];
  for (const t of teachers) {
    const [att, leaves, subs, plans] = await Promise.all([
      t.employeeId
        ? StaffAttendanceRecord.find({ schoolId: ctx.schoolId, employeeId: t.employeeId, date: { $gte: since } }).select('status').lean<{ status: string }[]>()
        : Promise.resolve([] as { status: string }[]),
      LeaveRequest.find({ schoolId: ctx.schoolId, teacherName: t.fullName, status: 'approved', dateTo: { $gte: addDaysISO(today(), -90) } })
        .select('dateFrom dateTo leaveType').lean<{ dateFrom: string; dateTo: string; leaveType: string }[]>(),
      TimetableSubstitute.countDocuments({ schoolId: ctx.schoolId, isDeleted: false, status: 'active', substituteTeacherName: t.fullName, date: { $gte: new Date(`${since}T00:00:00`) } }),
      AcademicPlan.find({ schoolId: ctx.schoolId, teacherId: String(t._id) }).select('class section subject days.blockType days.status days.date')
        .lean<{ class: string; section?: string; subject: string; days: { blockType: string; status: string; date: Date }[] }[]>(),
    ]);
    const now = new Date(`${today()}T00:00:00`);
    const count = (st: string) => att.filter((x) => x.status === st).length;
    out.push({
      teacher: t.fullName, subjects: t.subjects ?? [], classes: t.assignedClasses ?? [],
      attendanceLast30Days: { present: count('present'), late: count('late'), absent: count('absent'), recordsFound: att.length },
      approvedLeavesLast90Days: leaves.map((l) => ({ from: l.dateFrom, to: l.dateTo, type: l.leaveType })),
      substitutePeriodsTakenLast30Days: subs,
      syllabus: plans.map((pl) => {
        const teach = pl.days.filter((d) => d.blockType === 'teach');
        return {
          class: `${pl.class}${pl.section ?? ''}`, subject: pl.subject,
          progressPercent: teach.length ? Math.round((teach.filter((d) => d.status === 'completed').length / teach.length) * 100) : 0,
          behindDays: teach.filter((d) => d.date < now && d.status !== 'completed').length,
        };
      }),
    });
  }
  return { found: true, teachers: out, note: out.length > 1 ? 'Several teachers match - ask which one is meant.' : undefined };
}

export const moreAssistantData = {
  getAttendanceTrend, getFeeTrend, getTeacherProfile,
  getBehaviorSummary, getTransportSummary, getPayrollSummary, getExpenseSummary, getStockAndAssets, getPlanCompliance,
};
