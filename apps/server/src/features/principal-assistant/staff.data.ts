import { Teacher } from '../teachers/teacher.model';
import { LeaveRequest } from '../leave-requests/leave-request.model';
import { Timetable } from '../timetable/timetable.model';
import { PeriodSlot } from '../timetable/timetable.period.model';
import { TimetableSubstitute } from '../timetable/timetable.substitute.model';
import { StaffAttendanceRecord } from '../staff-attendance/staff-attendance.model';
import { Employee } from '../employees/employee.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { AuthContext } from '../../lib/auth-context';
import { extractQueryParams, escapeRegex, dayOfWeekFor, addDaysISO } from './query-params';

// ── Teachers & staff: leave, timetable, free periods, substitutes, late ──────

async function resolveDate(ctx: AuthContext, message: string, fallback?: 'today' | 'tomorrow') {
  const p = await extractQueryParams(message, ctx);
  const today = attendanceRepository.todayString();
  const date = p.date ?? (fallback === 'tomorrow' ? addDaysISO(today, 1) : today);
  return { p, date };
}

async function getTeachersOnLeave(ctx: AuthContext, message = '') {
  const { date } = await resolveDate(ctx, message);
  const today = attendanceRepository.todayString();
  // Without an explicit date, show today AND tomorrow so "who is on leave" is never silently half-answered.
  const dates = message && date !== today ? [date] : [today, addDaysISO(today, 1)];
  const out = [];
  for (const d of dates) {
    const leaves = await LeaveRequest.find({
      schoolId: ctx.schoolId, status: 'approved', dateFrom: { $lte: d }, dateTo: { $gte: d },
    }).select('teacherName leaveType dateFrom dateTo reason').lean<{ teacherName: string; leaveType: string; dateFrom: string; dateTo: string; reason: string }[]>();
    out.push({
      date: d,
      onLeave: leaves.map((l) => ({
        name: l.teacherName, type: l.leaveType === 'half_day' ? 'half day' : 'full day',
        from: l.dateFrom, to: l.dateTo, reason: l.reason,
      })),
    });
  }
  return { days: out };
}

async function getPendingLeaves(ctx: AuthContext) {
  const pending = await LeaveRequest.find({ schoolId: ctx.schoolId, status: 'pending' })
    .sort({ createdAt: 1 }).limit(40)
    .lean<{ teacherName: string; leaveType: string; dateFrom: string; dateTo: string; reason: string; createdAt: Date }[]>();
  return {
    pendingCount: pending.length,
    requests: pending.map((l) => ({
      teacher: l.teacherName, type: l.leaveType === 'half_day' ? 'half day' : 'full day',
      from: l.dateFrom, to: l.dateTo, reason: l.reason, requestedOn: l.createdAt.toISOString().slice(0, 10),
    })),
  };
}

// ── Timetable-based answers ──────────────────────────────────────────────────

interface Slot { _id: unknown; name: string; orderIndex: number; startTime: string; endTime: string; isBreak: boolean }

async function loadSchedule(ctx: AuthContext) {
  const [slots, tables] = await Promise.all([
    PeriodSlot.find({ schoolId: ctx.schoolId, isDeleted: false }).sort({ orderIndex: 1 }).lean<Slot[]>(),
    Timetable.find({ schoolId: ctx.schoolId, isDeleted: false, status: 'published' })
      .select('class section entries').lean<{ class: string; section: string; entries: { dayOfWeek: number; slotId: string; subjectName: string; teacherName?: string; teacherId?: string }[] }[]>(),
  ]);
  return { slots: slots.filter((s) => !s.isBreak), tables };
}

async function getTeacherSchedule(ctx: AuthContext, message = '') {
  const { p, date } = await resolveDate(ctx, message);
  // The extractor sometimes files a staff name under studentName; a real Teacher match settles it.
  const name = p.teacherName ?? p.studentName;
  if (!name) return { found: false, note: "No teacher name was found in the question." };
  const dow = dayOfWeekFor(date);
  const { slots, tables } = await loadSchedule(ctx);
  const words = name.split(/\s+/).filter(Boolean).slice(0, 4);

  const teachers = await Teacher.find({ schoolId: ctx.schoolId, isDeleted: false, $and: words.map((w) => ({ fullName: new RegExp(escapeRegex(w), 'i') })) })
    .select('fullName').limit(3).lean<{ fullName: string }[]>();
  if (!teachers.length) return { found: false, note: `No teacher matching "${name}" was found.` };
  const t = teachers[0];

  const busy = new Map<string, string>();
  for (const tt of tables) {
    for (const e of tt.entries) {
      if (e.dayOfWeek === dow && e.teacherName && e.teacherName.toLowerCase() === t.fullName.toLowerCase()) {
        busy.set(e.slotId, `${e.subjectName} — Class ${tt.class}-${tt.section}`);
      }
    }
  }
  const periods = slots.map((s) => ({
    period: s.name, time: `${s.startTime}-${s.endTime}`, teaching: busy.get(String(s._id)) ?? null,
  }));
  return {
    found: true, teacher: t.fullName, date, isSchoolDay: dow !== 0,
    otherMatches: teachers.slice(1).map((x) => x.fullName),
    periodsTeaching: periods.filter((x) => x.teaching).length,
    freePeriods: periods.filter((x) => !x.teaching).map((x) => `${x.period} (${x.time})`),
    schedule: periods,
  };
}

async function getFreeTeachers(ctx: AuthContext, message = '') {
  const { p, date } = await resolveDate(ctx, message);
  const dow = dayOfWeekFor(date);
  const { slots, tables } = await loadSchedule(ctx);
  const slot = p.period ? slots[p.period - 1] : undefined;
  if (!slot) return { found: false, note: `Period ${p.period ?? '?'} does not exist. This school has ${slots.length} periods.` };

  const [teachers, leaves] = await Promise.all([
    Teacher.find({ schoolId: ctx.schoolId, isDeleted: false, employmentStatus: 'active' }).select('fullName subjects').lean<{ fullName: string; subjects?: string[] }[]>(),
    LeaveRequest.find({ schoolId: ctx.schoolId, status: 'approved', dateFrom: { $lte: date }, dateTo: { $gte: date } }).select('teacherName').lean<{ teacherName: string }[]>(),
  ]);
  const busy = new Set<string>();
  for (const tt of tables) {
    for (const e of tt.entries) {
      if (e.dayOfWeek === dow && String(e.slotId) === String(slot._id) && e.teacherName) busy.add(e.teacherName.toLowerCase());
    }
  }
  const away = new Set(leaves.map((l) => l.teacherName.toLowerCase()));
  const free = teachers.filter((t) => !busy.has(t.fullName.toLowerCase()) && !away.has(t.fullName.toLowerCase()));
  return {
    found: true, date, period: slot.name, time: `${slot.startTime}-${slot.endTime}`,
    freeCount: free.length,
    freeTeachers: free.slice(0, 60).map((t) => ({ name: t.fullName, subjects: t.subjects ?? [] })),
    note: 'Teachers on approved leave are excluded.',
  };
}

async function getSubstituteLeaderboard(ctx: AuthContext) {
  const since = new Date(Date.now() - 30 * 86400000);
  const agg = await TimetableSubstitute.aggregate<{ _id: string; periods: number }>([
    { $match: { schoolId: ctx.schoolId, isDeleted: false, status: 'active', date: { $gte: since } } },
    { $group: { _id: '$substituteTeacherName', periods: { $sum: 1 } } },
    { $sort: { periods: -1 } },
    { $limit: 15 },
  ]);
  return {
    windowDays: 30,
    totalSubstitutePeriods: agg.reduce((s, a) => s + a.periods, 0),
    teachers: agg.map((a) => ({ name: a._id, substitutePeriods: a.periods })),
  };
}

async function getLateStaff(ctx: AuthContext, message = '') {
  const { date } = await resolveDate(ctx, message);
  const records = await StaffAttendanceRecord.find({ schoolId: ctx.schoolId, date, status: 'late' })
    .select('employeeId checkIn').lean<{ employeeId: string; checkIn?: { time: Date } }[]>();
  const emps = records.length
    ? await Employee.find({ schoolId: ctx.schoolId, employeeId: { $in: records.map((r) => r.employeeId) } })
        .select('employeeId fullName').lean<{ employeeId: string; fullName: string }[]>()
    : [];
  const name = new Map(emps.map((e) => [e.employeeId, e.fullName]));
  return {
    date,
    lateCount: records.length,
    staff: records.map((r) => ({
      name: name.get(r.employeeId) ?? r.employeeId,
      checkedInAt: r.checkIn?.time ? r.checkIn.time.toISOString().slice(11, 16) + ' UTC' : null,
    })),
  };
}

export const staffAssistantData = {
  getTeachersOnLeave, getPendingLeaves, getTeacherSchedule, getFreeTeachers, getSubstituteLeaderboard, getLateStaff,
};
