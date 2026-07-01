import { Student } from '../students/student.model';
import { Enquiry } from '../enquiries/enquiry.model';
import { Timetable } from '../timetable/timetable.model';
import { SchoolEvent } from '../events/event.model';
import { FeeRecord } from '../fees/fee.model';
import { Attendance } from '../attendance/attendance.model';
import { SavedReport, ISavedReport } from './reports.model';
import type {
  ReportFilters,
  StudentAnalytics,
  AttendanceAnalytics,
  AttendanceClassRow,
  FeeAnalytics,
  AdmissionsAnalytics,
  TimetableAnalytics,
  CalendarAnalytics,
  PrincipalUpcomingEvent,
} from '@schoolos/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function sixMonthsAgo(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Student analytics ─────────────────────────────────────────────────────────

export async function getStudentAnalytics(
  schoolId: string,
  _filters: ReportFilters,
): Promise<StudentAnalytics> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonths = sixMonthsAgo();

  const [totalCount, activeCount, newCount, genderAgg, classAgg, statusAgg, trendAgg] =
    await Promise.all([
      Student.countDocuments({ schoolId, isDeleted: false }),
      Student.countDocuments({ schoolId, isDeleted: false, admissionStatus: 'active' }),
      Student.countDocuments({ schoolId, isDeleted: false, createdAt: { $gte: firstOfMonth } }),
      Student.aggregate<{ _id: string; count: number }>([
        { $match: { schoolId, isDeleted: false } },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
      Student.aggregate<{ _id: string; count: number }>([
        { $match: { schoolId, isDeleted: false } },
        { $group: { _id: '$class', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Student.aggregate<{ _id: string; count: number }>([
        { $match: { schoolId, isDeleted: false } },
        { $group: { _id: '$admissionStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Student.aggregate<{ _id: { y: number; m: number }; count: number }>([
        { $match: { schoolId, isDeleted: false, createdAt: { $gte: sixMonths } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
    ]);

  return {
    summary: { total: totalCount, active: activeCount, newThisMonth: newCount },
    byGender:  genderAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
    byClass:   classAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
    byStatus:  statusAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
    monthlyTrend: trendAgg.map((r) => ({ month: monthLabel(r._id.y, r._id.m), count: r.count })),
  };
}

// ── Attendance analytics ──────────────────────────────────────────────────────

export async function getAttendanceAnalytics(
  schoolId: string,
  filters: ReportFilters,
): Promise<AttendanceAnalytics> {
  const today = new Date().toISOString().split('T')[0];
  const dateFrom = filters.dateFrom ?? (() => {
    const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0];
  })();
  const dateTo = filters.dateTo ?? today;

  const matchBase: Record<string, unknown> = {
    schoolId,
    isDeleted: false,
    date: { $gte: dateFrom, $lte: dateTo },
  };
  if (filters.class)   matchBase.class   = filters.class;
  if (filters.section) matchBase.section = filters.section;

  const [summaryAgg, classAgg, dailyAgg] = await Promise.all([
    // Overall summary
    Attendance.aggregate<{ _id: string; count: number }>([
      { $match: matchBase },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Class-wise breakdown
    Attendance.aggregate<{ _id: { class: string; section: string; status: string }; count: number }>([
      { $match: matchBase },
      { $group: { _id: { class: '$class', section: '$section', status: '$status' }, count: { $sum: 1 } } },
    ]),
    // Daily trend
    Attendance.aggregate<{ _id: { date: string; status: string }; count: number }>([
      { $match: matchBase },
      { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]),
  ]);

  // Build summary object
  const sc: Record<string, number> = {};
  for (const r of summaryAgg) sc[r._id] = r.count;
  const present       = sc.present        ?? 0;
  const absent        = sc.absent          ?? 0;
  const late          = sc.late            ?? 0;
  const half_day      = sc.half_day        ?? 0;
  const leave_approved= sc.leave_approved  ?? 0;
  const total         = present + absent + late + half_day + leave_approved;

  const summary = {
    total, present, absent, late, half_day, leave_approved,
    attendanceRate: total > 0 ? Math.round(((present + late + half_day) / total) * 100) : 0,
  };

  // Pivot class-wise
  const classMap = new Map<string, AttendanceClassRow>();
  for (const r of classAgg) {
    const key = `${r._id.class}-${r._id.section}`;
    if (!classMap.has(key)) {
      classMap.set(key, { class: r._id.class, section: r._id.section, present: 0, absent: 0, late: 0, total: 0, rate: 0 });
    }
    const row = classMap.get(key)!;
    if (r._id.status === 'present') row.present += r.count;
    else if (r._id.status === 'absent') row.absent += r.count;
    else if (r._id.status === 'late') row.late += r.count;
    row.total += r.count;
  }
  const byClass = Array.from(classMap.values()).map((r) => ({
    ...r,
    rate: r.total > 0 ? Math.round(((r.present + r.late) / r.total) * 100) : 0,
  })).sort((a, b) => a.class.localeCompare(b.class));

  // Pivot daily trend
  const dailyMap = new Map<string, { present: number; absent: number; total: number }>();
  for (const r of dailyAgg) {
    const date = r._id.date;
    if (!dailyMap.has(date)) dailyMap.set(date, { present: 0, absent: 0, total: 0 });
    const row = dailyMap.get(date)!;
    if (r._id.status === 'present' || r._id.status === 'late') row.present += r.count;
    else if (r._id.status === 'absent') row.absent += r.count;
    row.total += r.count;
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      present: v.present,
      absent: v.absent,
      total: v.total,
      rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
    }));

  return { summary, byClass, dailyTrend };
}

// ── Fee analytics ─────────────────────────────────────────────────────────────

export async function getFeeAnalytics(
  schoolId: string,
  filters: ReportFilters,
): Promise<FeeAnalytics> {
  const matchBase: Record<string, unknown> = { schoolId, isDeleted: false };
  if (filters.academicYear) matchBase.academicYear = filters.academicYear;

  const sixMonths = sixMonthsAgo();

  const [statusAgg, monthlyAgg, headAgg] = await Promise.all([
    FeeRecord.aggregate<{ _id: string; count: number; amount: number }>([
      { $match: matchBase },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
    ]),
    FeeRecord.aggregate<{ _id: { y: number; m: number }; collected: number; charged: number }>([
      { $match: { ...matchBase, createdAt: { $gte: sixMonths } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          collected: { $sum: '$paidAmount' },
          charged:   { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    FeeRecord.aggregate<{ _id: string; collected: number; total: number; count: number }>([
      { $match: matchBase },
      {
        $group: {
          _id:       '$feeHead',
          collected: { $sum: '$paidAmount' },
          total:     { $sum: '$totalAmount' },
          count:     { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  // Build summary from statusAgg
  let totalCharged = 0, totalCollected = 0, overdueCount = 0, pendingCount = 0;
  for (const r of statusAgg) {
    totalCharged += r.amount;
    if (r._id === 'paid' || r._id === 'partially_paid') totalCollected += r.amount;
    if (r._id === 'overdue') overdueCount += r.count;
    if (r._id === 'pending' || r._id === 'partially_paid') pendingCount += r.count;
  }
  // Re-aggregate collected properly from actual paidAmount
  const collectedAgg = await FeeRecord.aggregate<{ collected: number }>([
    { $match: matchBase },
    { $group: { _id: null, collected: { $sum: '$paidAmount' } } },
  ]);
  totalCollected = collectedAgg[0]?.collected ?? 0;

  return {
    summary: {
      totalCharged,
      totalCollected,
      totalOutstanding: totalCharged - totalCollected,
      overdueCount,
      pendingCount,
    },
    monthlyTrend: monthlyAgg.map((r) => ({
      month:     monthLabel(r._id.y, r._id.m),
      collected: r.collected,
      charged:   r.charged,
    })),
    byHead: headAgg.map((r) => ({
      label:     r._id ?? 'Other',
      collected: r.collected,
      total:     r.total,
      count:     r.count,
    })),
    byStatus: statusAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
  };
}

// ── Admissions analytics ──────────────────────────────────────────────────────

export async function getAdmissionsAnalytics(
  schoolId: string,
  _filters: ReportFilters,
): Promise<AdmissionsAnalytics> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonths = sixMonthsAgo();

  const [stageAgg, sourceAgg, monthlyAgg, pendingFollowUp, convertedCount] = await Promise.all([
    Enquiry.aggregate<{ _id: string; count: number }>([
      { $match: { schoolId, isDeleted: false } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Enquiry.aggregate<{ _id: string; count: number }>([
      { $match: { schoolId, isDeleted: false } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Enquiry.aggregate<{ _id: { y: number; m: number }; count: number; converted: number }>([
      { $match: { schoolId, isDeleted: false, createdAt: { $gte: sixMonths } } },
      {
        $group: {
          _id:       { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          count:     { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$stage', 'converted'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Enquiry.countDocuments({
      schoolId,
      isDeleted: false,
      followUpDate: { $lte: now },
      stage: { $nin: ['converted', 'lost'] },
    }),
    Enquiry.countDocuments({
      schoolId,
      isDeleted: false,
      stage: 'converted',
      'conversionData.convertedAt': { $gte: firstOfMonth },
    }),
  ]);

  const byStageMap: Record<string, number> = {};
  let total = 0;
  for (const r of stageAgg) { byStageMap[r._id] = r.count; total += r.count; }

  const activeCount = total - (byStageMap.lost ?? 0) - (byStageMap.converted ?? 0);
  const conversionRate = total > 0 ? Math.round(((byStageMap.converted ?? 0) / total) * 100) : 0;
  const newThisMonth = monthlyAgg.find((r) => {
    const y = now.getFullYear(), m = now.getMonth() + 1;
    return r._id.y === y && r._id.m === m;
  })?.count ?? 0;

  return {
    summary: {
      total,
      active: activeCount,
      convertedThisMonth: convertedCount,
      newThisMonth,
      pendingFollowUp,
      conversionRate,
    },
    byStage:  stageAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
    bySource: sourceAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
    monthlyTrend: monthlyAgg.map((r) => ({
      month:     monthLabel(r._id.y, r._id.m),
      count:     r.count,
      converted: r.converted,
    })),
  };
}

// ── Timetable analytics ───────────────────────────────────────────────────────

export async function getTimetableAnalytics(
  schoolId: string,
): Promise<TimetableAnalytics> {
  const [statusAgg, teacherAgg, subjectAgg] = await Promise.all([
    Timetable.aggregate<{ _id: string; count: number }>([
      { $match: { schoolId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Timetable.aggregate<{ _id: { tid: string; name: string }; count: number }>([
      { $match: { schoolId, isDeleted: false, status: 'published' } },
      { $unwind: '$entries' },
      { $match: { 'entries.teacherName': { $exists: true, $ne: '' } } },
      { $group: { _id: { tid: '$entries.teacherId', name: '$entries.teacherName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    Timetable.aggregate<{ _id: string; count: number }>([
      { $match: { schoolId, isDeleted: false, status: 'published' } },
      { $unwind: '$entries' },
      { $group: { _id: '$entries.subjectName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
  ]);

  const sc: Record<string, number> = {};
  for (const r of statusAgg) sc[r._id] = r.count;

  return {
    summary: {
      published: sc.published ?? 0,
      draft:     sc.draft     ?? 0,
      archived:  sc.archived  ?? 0,
      total:     (sc.published ?? 0) + (sc.draft ?? 0) + (sc.archived ?? 0),
    },
    teacherWorkload:    teacherAgg.map((r) => ({ teacherName: r._id.name ?? 'Unknown', entriesCount: r.count })),
    subjectDistribution: subjectAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
  };
}

// ── Calendar analytics ────────────────────────────────────────────────────────

export async function getCalendarAnalytics(
  schoolId: string,
  _filters: ReportFilters,
): Promise<CalendarAnalytics> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const todayStr     = now.toISOString().split('T')[0];
  const futureStr    = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })();
  const firstStr     = firstOfMonth.toISOString().split('T')[0];
  const lastStr      = lastOfMonth.toISOString().split('T')[0];

  const [typeAgg, thisMonthCount, upcomingEvents, publishedCount] = await Promise.all([
    SchoolEvent.aggregate<{ _id: string; count: number }>([
      { $match: { schoolId, isDeleted: false } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    SchoolEvent.countDocuments({
      schoolId, isDeleted: false,
      startDate: { $gte: firstStr, $lte: lastStr },
    }),
    SchoolEvent.find({
      schoolId, isDeleted: false,
      status: { $in: ['published', 'scheduled'] },
      startDate: { $gte: todayStr, $lte: futureStr },
    })
      .sort({ startDate: 1 })
      .limit(10)
      .select('_id title eventType startDate isAllDay startTime')
      .lean(),
    SchoolEvent.countDocuments({ schoolId, isDeleted: false, status: 'published' }),
  ]);

  const upcoming: PrincipalUpcomingEvent[] = upcomingEvents.map((e) => ({
    id:        (e._id as { toString(): string }).toString(),
    title:     e.title,
    eventType: e.eventType,
    startDate: (e.startDate as Date).toISOString(),
    isAllDay:  e.isAllDay,
    startTime: e.startTime,
  }));

  return {
    summary: {
      thisMonthCount,
      upcomingCount:   upcoming.length,
      totalPublished:  publishedCount,
    },
    byType:   typeAgg.map((r) => ({ label: r._id ?? 'Unknown', count: r.count })),
    upcoming,
  };
}

// ── Saved reports CRUD ────────────────────────────────────────────────────────

export const savedReportRepository = {
  async create(data: {
    schoolId: string;
    name: string;
    description?: string;
    category: string;
    filters: Record<string, unknown>;
    isPublic: boolean;
    createdBy: string;
    createdByName: string;
  }): Promise<ISavedReport> {
    return SavedReport.create(data);
  },

  async findAll(schoolId: string): Promise<ISavedReport[]> {
    return SavedReport.find({ schoolId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<ISavedReport[]>();
  },

  async findById(id: string, schoolId: string): Promise<ISavedReport | null> {
    return SavedReport.findOne({ _id: id, schoolId, isDeleted: false }).lean<ISavedReport>();
  },

  async softDelete(id: string, schoolId: string): Promise<boolean> {
    const r = await SavedReport.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return r.modifiedCount > 0;
  },

  async touchLastRun(id: string): Promise<void> {
    await SavedReport.updateOne({ _id: id }, { $set: { lastRunAt: new Date() } });
  },
};
