import { eventRepository } from '../events/event.repository';

export interface TeachingWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function loadHolidayDates(schoolId: string, start: Date, end: Date): Promise<Set<string>> {
  const { events } = await eventRepository.findAll(schoolId, {
    eventType: 'holiday',
    startFrom: start.toISOString(),
    startTo: end.toISOString(),
    limit: 500,
  });

  const dates = new Set<string>();
  for (const ev of events) {
    const cur = new Date(ev.startDate);
    const last = new Date(ev.endDate);
    // Guard against unbounded ranges (bad data) — cap at 60 days per event.
    let guard = 0;
    while (cur <= last && guard < 60) {
      dates.add(isoDate(cur));
      cur.setDate(cur.getDate() + 1);
      guard += 1;
    }
  }
  return dates;
}

/** Groups weekdays (Mon-Fri) between start/end into calendar weeks, skipping
 *  holidays, and numbers only the weeks that have at least one teaching day. */
export async function computeTeachingWeeks(schoolId: string, start: Date, end: Date): Promise<TeachingWeek[]> {
  const holidayDates = await loadHolidayDates(schoolId, start, end);
  const weeksMap = new Map<string, Date[]>();

  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6 && !holidayDates.has(isoDate(cur))) {
      const key = isoDate(mondayOf(cur));
      const list = weeksMap.get(key) ?? [];
      list.push(new Date(cur));
      weeksMap.set(key, list);
    }
    cur.setDate(cur.getDate() + 1);
  }

  return [...weeksMap.keys()]
    .sort()
    .map((key, idx) => {
      const days = weeksMap.get(key)!;
      return { weekNumber: idx + 1, startDate: days[0], endDate: days[days.length - 1] };
    });
}

/** Spreads a week's tasks evenly across its weekdays (Mon-Fri within the
 *  week's start/end range) so each task gets a due date for the "today's
 *  tasks" view — an approximation that doesn't re-exclude a mid-week holiday
 *  the way computeTeachingWeeks does, which is an acceptable trade-off for
 *  what's just a due-date spread, not a scheduling guarantee. */
export function distributeDueDates(startDate: Date, endDate: Date, taskCount: number): Date[] {
  const weekdays: Date[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) weekdays.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  if (weekdays.length === 0) weekdays.push(new Date(startDate));

  return Array.from({ length: taskCount }, (_, i) => weekdays[i % weekdays.length]);
}
