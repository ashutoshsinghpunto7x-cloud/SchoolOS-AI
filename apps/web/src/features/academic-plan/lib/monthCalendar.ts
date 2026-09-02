import type { AcademicPlanDay, AcademicSpecialDay, SchoolEvent } from '@schoolos/types';

// Shared calendar-building for the Week and Month tabs: every calendar day
// in a date range, including ones the Academic Planning Engine never
// creates a plan entry for (weekly-offs, holidays, full-day-off special
// days — see academic-plan.util.ts's isEligibleDay, which is exactly what
// these three sources feed). A date with no plan entry is classified in
// that priority order so the label always says *why* it's off, not just
// that it is.

export interface MonthCalendarDay {
  date: Date;
  dateKey: string;
  planDay?: AcademicPlanDay;
  /** Set only when there's no planDay — why this date has no period. */
  offLabel?: string;
}

export interface MonthCalendarWeek {
  key: string;
  rangeLabel: string;
  weekStart: Date;
  days: MonthCalendarDay[];
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function weekRangeLabel(weekStart: Date): string {
  return `${formatDay(weekStart)} – ${formatDay(addDays(weekStart, 6))}`;
}

/** Every calendar day from `start` to `end` (inclusive), classified against
 *  the plan + calendar data. */
export function buildCalendarDays(
  start: Date,
  end: Date,
  planDays: AcademicPlanDay[],
  weeklyOffDays: number[],
  holidays: SchoolEvent[],
  specialDays: AcademicSpecialDay[],
): MonthCalendarDay[] {
  const planByDate = new Map(planDays.map((d) => [isoDay(new Date(d.date)), d]));
  const specialOffByDate = new Map(
    specialDays.filter((s) => s.teachingImpact === 'full_day_off').map((s) => [isoDay(new Date(s.date)), s.label]),
  );
  const holidayRanges = holidays.map((h) => ({ start: new Date(h.startDate), end: new Date(h.endDate), title: h.title }));

  function holidayLabelFor(date: Date): string | undefined {
    return holidayRanges.find((r) => date >= r.start && date <= r.end)?.title;
  }

  const days: MonthCalendarDay[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const date = new Date(cur);
    const dateKey = isoDay(date);
    const planDay = planByDate.get(dateKey);
    const offLabel = planDay
      ? undefined
      : specialOffByDate.get(dateKey)
        ?? holidayLabelFor(date)
        ?? (weeklyOffDays.includes(date.getDay()) ? WEEKDAY_NAMES[date.getDay()] : 'No period today');
    days.push({ date, dateKey, planDay, offLabel });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Groups already-built calendar days into Monday–Sunday week buckets. */
export function groupIntoWeeks(days: MonthCalendarDay[]): MonthCalendarWeek[] {
  const weekMap = new Map<string, MonthCalendarDay[]>();
  for (const day of days) {
    const weekStart = mondayOf(day.date);
    const key = isoDay(weekStart);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(day);
  }

  return [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, weekDays]) => {
      const first = weekDays[0].date;
      const last = weekDays[weekDays.length - 1].date;
      const rangeLabel = first.getTime() === last.getTime() ? formatDay(first) : `${formatDay(first)} – ${formatDay(last)}`;
      return { key, rangeLabel, weekStart: mondayOf(first), days: weekDays };
    });
}

export function buildMonthCalendar(
  monthRef: Date,
  planDays: AcademicPlanDay[],
  weeklyOffDays: number[],
  holidays: SchoolEvent[],
  specialDays: AcademicSpecialDay[],
): MonthCalendarWeek[] {
  const year = monthRef.getFullYear();
  const month = monthRef.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return groupIntoWeeks(buildCalendarDays(start, end, planDays, weeklyOffDays, holidays, specialDays));
}

export function buildWeekCalendar(
  weekStart: Date,
  planDays: AcademicPlanDay[],
  weeklyOffDays: number[],
  holidays: SchoolEvent[],
  specialDays: AcademicSpecialDay[],
): MonthCalendarDay[] {
  return buildCalendarDays(weekStart, addDays(weekStart, 6), planDays, weeklyOffDays, holidays, specialDays);
}

/** Distinct chapter/revision/assessment labels taught within one week, in
 *  the order first encountered — the Month tab's condensed rollup per week. */
export function summarizeWeekLabels(days: MonthCalendarDay[]): string[] {
  const labels: string[] = [];
  for (const day of days) {
    const plan = day.planDay;
    if (!plan || plan.blockType === 'buffer') continue;
    const label = plan.blockType === 'teach'
      ? plan.chapterName ?? plan.topicTitle
      : plan.blockType === 'revision'
        ? `Revision — ${plan.examName ?? 'upcoming exam'}`
        : plan.examName ?? 'Assessment';
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}
