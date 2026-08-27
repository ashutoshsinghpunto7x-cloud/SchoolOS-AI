import { eventRepository } from '../events/event.repository';
import type { PlannerTaskType } from '@schoolos/types';

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

/** Lists the Mon-Fri weekdays between start/end (inclusive) — does not
 *  re-exclude holidays the way computeTeachingWeeks does, which is an
 *  acceptable trade-off for what's just a due-date spread, not a
 *  scheduling guarantee. */
export function listWeekdays(startDate: Date, endDate: Date): Date[] {
  const weekdays: Date[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) weekdays.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  if (weekdays.length === 0) weekdays.push(new Date(startDate));
  return weekdays;
}

/** Spreads a week's tasks evenly across its weekdays so each task gets a due
 *  date for the "today's tasks" view. */
export function distributeDueDates(startDate: Date, endDate: Date, taskCount: number): Date[] {
  const weekdays = listWeekdays(startDate, endDate);
  return Array.from({ length: taskCount }, (_, i) => weekdays[i % weekdays.length]);
}

/** Builds a day-by-day lesson sequence for a chapter's whole teaching block (which may span
 *  several weeks), the way a teacher would actually pace it rather than repeating "explain
 *  <chapter>" on every single day: an intro day, then one explanation day per topic (cycling
 *  through the chapter's saved topics if there are more days than topics), an activity day and a
 *  practice-worksheet day once the block is long enough to afford them, a unit test near the end
 *  for a long block, and a revision/doubt-session day to close it out. Short blocks (1-3 days)
 *  skip straight to whichever of these actually fit. `totalDays` is the number of teaching days
 *  across every week assigned to this chapter, computed by the caller before this runs. */
export function buildChapterDayPlan(
  chapterName: string,
  topics: string[],
  totalDays: number,
): { title: string; type: PlannerTaskType }[] {
  if (totalDays <= 0) return [];
  if (totalDays === 1) return [{ title: `${chapterName} — overview`, type: 'explain' }];

  // Reserve trailing "consolidation" days from the end of the block, longest block first —
  // each only kicks in once there's enough runway left to still leave at least one day for
  // actual explanation.
  const tail: { title: string; type: PlannerTaskType }[] = [];
  if (totalDays >= 9) tail.push({ title: `${chapterName} — chapter test`, type: 'unit_test' });
  if (totalDays >= 6) tail.push({ title: `${chapterName} — activity`, type: 'activity' });
  if (totalDays >= 4) tail.push({ title: `${chapterName} — practice worksheet`, type: 'worksheet' });
  tail.push({ title: `${chapterName} — revision & doubt session`, type: 'revision' });

  const explainCount = Math.max(1, totalDays - tail.length);
  const explainDays: { title: string; type: PlannerTaskType }[] = [];
  for (let i = 0; i < explainCount; i++) {
    if (i === 0) {
      explainDays.push({ title: `Introduction to ${chapterName}`, type: 'explain' });
    } else if (topics.length > 0) {
      explainDays.push({ title: `${chapterName}: ${topics[(i - 1) % topics.length]}`, type: 'explain' });
    } else {
      explainDays.push({ title: `${chapterName} — key concepts (part ${i + 1})`, type: 'explain' });
    }
  }

  return [...explainDays, ...tail].slice(0, totalDays);
}
