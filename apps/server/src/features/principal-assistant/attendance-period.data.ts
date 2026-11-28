import { Attendance } from '../attendance/attendance.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { classNameVariants } from '../../lib/class-name';
import { AuthContext } from '../../lib/auth-context';
import { extractQueryParams } from './query-params';
import { defaultRange, parseDateRange } from './date-range';

// ── Class / whole-school attendance over a period ────────────────────────────
// "Show attendance for Class 6A" → "last month". The existing class fetchers
// only know *today*; this one takes a date range, so the follow-up changes the
// period and keeps the class. Every figure is counted from the day-by-day
// records; the percentage is derived from those counts.

const PRESENT_LIKE = new Set(['present', 'late', 'half_day']);
const MAX_ROWS = 40;

interface Row { class: string; section: string; status: string; date: string }

async function getClassAttendancePeriod(ctx: AuthContext, message = '') {
  const today = attendanceRepository.todayString();
  const p = await extractQueryParams(message, ctx);
  const range = parseDateRange(message, today) ?? defaultRange(today);

  const query: Record<string, unknown> = {
    schoolId: ctx.schoolId, isDeleted: false, date: { $gte: range.from, $lte: range.to },
  };
  if (p.className) query.class = { $in: classNameVariants(p.className) };
  if (p.section) query.section = p.section;

  const rows = await Attendance.find(query).select('class section status date').limit(200000).lean<Row[]>();

  const by = new Map<string, { present: number; absent: number; leave: number; marked: number; days: Set<string> }>();
  let present = 0, absent = 0, leave = 0;
  const allDays = new Set<string>();
  for (const r of rows) {
    const key = `${r.class}-${r.section}`;
    const e = by.get(key) ?? { present: 0, absent: 0, leave: 0, marked: 0, days: new Set<string>() };
    e.marked += 1;
    e.days.add(r.date);
    allDays.add(r.date);
    if (PRESENT_LIKE.has(r.status)) { e.present += 1; present += 1; }
    else if (r.status === 'absent') { e.absent += 1; absent += 1; }
    else if (r.status === 'leave_approved') { e.leave += 1; leave += 1; }
    by.set(key, e);
  }
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

  const classes = [...by.entries()]
    .map(([key, e]) => ({
      class: key, daysMarked: e.days.size, presentEntries: e.present, absentEntries: e.absent,
      approvedLeaveEntries: e.leave, attendancePercent: pct(e.present, e.marked),
    }))
    .sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }));

  return {
    period: range,
    filter: p.className ? `${p.className}${p.section ?? ''}` : 'whole school',
    schoolDaysWithAttendance: allDays.size,
    totalEntries: rows.length,
    presentEntries: present,
    absentEntries: absent,
    approvedLeaveEntries: leave,
    attendancePercent: pct(present, rows.length),
    note: rows.length
      ? 'Entries are student-days (one student on one day). Percentages are computed from these counts.'
      : 'No attendance has been recorded for this filter and period.',
    byClass: classes.slice(0, MAX_ROWS),
    byClassTruncated: classes.length > MAX_ROWS,
  };
}

export const attendancePeriodData = { getClassAttendancePeriod };
