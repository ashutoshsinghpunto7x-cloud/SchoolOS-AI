import { eventRepository } from '../events/event.repository';
import type { PlannerTaskType, ChapterTopicNode } from '@schoolos/types';

export interface PlannerDayTask {
  title: string;
  type: PlannerTaskType;
  /** Topic(s) this task covers — only present when the chapter has a topicTree. An explain day
   *  tags just the unit(s) it explains; a tail day (worksheet/activity/unit_test/revision) tags
   *  the full accumulated set covered by the whole block, so a worksheet built from it can be
   *  scoped to "everything taught so far". */
  topicIds?: string[];
  /** Subtopic(s) this task covers — only set for unit(s) that are subtopic-level (a topic with no
   *  subtopics is tagged via topicIds alone). */
  subtopicIds?: string[];
}

/** One explain-day "unit" flattened out of a chapter's topicTree — a subtopic when the topic has
 *  subtopics, otherwise the topic itself. */
interface TopicUnit {
  label: string;
  topicId: string;
  subtopicId?: string;
}

/** Flattens a topicTree (ordered by each level's `order`) into the ordered list of units an
 *  explain-day budget gets distributed across. */
function flattenTopicTree(topicTree: ChapterTopicNode[]): TopicUnit[] {
  const units: TopicUnit[] = [];
  const sortedTopics = [...topicTree].sort((a, b) => a.order - b.order);
  for (const topic of sortedTopics) {
    if (topic.subtopics.length > 0) {
      const sortedSubtopics = [...topic.subtopics].sort((a, b) => a.order - b.order);
      for (const sub of sortedSubtopics) {
        units.push({ label: `${topic.name}: ${sub.name}`, topicId: topic.topicId, subtopicId: sub.subtopicId });
      }
    } else {
      units.push({ label: topic.name, topicId: topic.topicId });
    }
  }
  return units;
}

/** Spreads `units` (in order) across `dayCount` explain days. When there are more units than
 *  days, units are grouped into contiguous buckets (earlier units keep their own day for longer;
 *  trailing ones are the first to get folded together). When there are more days than units,
 *  each unit gets its own day and the leftover days are handed out round-robin starting from the
 *  first unit — so a unit is never given a 3rd day before every unit already has a 2nd. */
function distributeUnitsAcrossDays(units: TopicUnit[], dayCount: number): TopicUnit[][] {
  if (dayCount <= 0 || units.length === 0) return [];

  if (units.length > dayCount) {
    const base = Math.floor(units.length / dayCount);
    let extra = units.length % dayCount;
    const buckets: TopicUnit[][] = [];
    let idx = 0;
    for (let d = 0; d < dayCount; d++) {
      const size = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      buckets.push(units.slice(idx, idx + size));
      idx += size;
    }
    return buckets;
  }

  const daysPerUnit = units.map(() => 1);
  let remaining = dayCount - units.length;
  let i = 0;
  while (remaining > 0) {
    daysPerUnit[i % units.length] += 1;
    i += 1;
    remaining -= 1;
  }

  const buckets: TopicUnit[][] = [];
  units.forEach((unit, ui) => {
    for (let k = 0; k < daysPerUnit[ui]; k++) buckets.push([unit]);
  });
  return buckets;
}

/** Builds a short label for one explain day covering `units` (usually one, occasionally several
 *  when units outnumber days, or the same unit repeated across `occurrence`/`total` parts when
 *  days outnumber units). */
function labelForDay(chapterName: string, units: TopicUnit[], occurrence: number, total: number): string {
  if (units.length === 1) {
    const label = total > 1 ? `${units[0].label} (part ${occurrence}/${total})` : units[0].label;
    return `${chapterName}: ${label}`;
  }
  const combined = units.map((u) => u.label).join(' & ');
  if (combined.length <= 60) return `${chapterName}: ${combined}`;
  return `${chapterName}: ${units[0].label} & ${units.length - 1} more`;
}

function tagsForUnits(units: TopicUnit[]): { topicIds: string[]; subtopicIds?: string[] } {
  const topicIds = [...new Set(units.map((u) => u.topicId))];
  const subtopicIds = [...new Set(units.filter((u) => u.subtopicId).map((u) => u.subtopicId!))];
  return { topicIds, subtopicIds: subtopicIds.length > 0 ? subtopicIds : undefined };
}

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
 *  across every week assigned to this chapter, computed by the caller before this runs.
 *
 *  When the chapter has a structured `topicTree` (topic/subtopic capture, see chapter.model.ts),
 *  it's used instead of the flat `topics` list to weight the explain days for real: each
 *  topic/subtopic becomes its own "unit" and the explain-day budget is spread across those units
 *  (in topic/subtopic `order`) rather than round-robining a flat topic name. Design choice: when
 *  a topicTree is used, there's no longer a separate "Introduction to X" day carved out of the
 *  budget — the whole explain-day budget goes to units, and the earliest unit's day effectively
 *  serves as the opener. Every generated task also carries which unit(s) it covers
 *  (topicIds/subtopicIds) so a worksheet/paper generated for that day can be scoped to it; a tail
 *  (worksheet/activity/unit_test/revision) day tags the *full* accumulated set of units taught in
 *  the block, since tail days always come after every explain day. Chapters without a topicTree
 *  (or with an empty one) behave exactly as before — topicIds/subtopicIds are simply omitted. */
export function buildChapterDayPlan(
  chapterName: string,
  topics: string[],
  totalDays: number,
  topicTree?: ChapterTopicNode[],
): PlannerDayTask[] {
  const units = topicTree && topicTree.length > 0 ? flattenTopicTree(topicTree) : [];
  const allTags = units.length > 0 ? tagsForUnits(units) : undefined;

  if (totalDays <= 0) return [];
  if (totalDays === 1) {
    return [{ title: `${chapterName} — overview`, type: 'explain', ...(allTags ?? {}) }];
  }

  // Reserve trailing "consolidation" days from the end of the block, longest block first —
  // each only kicks in once there's enough runway left to still leave at least one day for
  // actual explanation.
  const tail: PlannerDayTask[] = [];
  if (totalDays >= 9) tail.push({ title: `${chapterName} — chapter test`, type: 'unit_test' });
  if (totalDays >= 6) tail.push({ title: `${chapterName} — activity`, type: 'activity' });
  if (totalDays >= 4) tail.push({ title: `${chapterName} — practice worksheet`, type: 'worksheet' });
  tail.push({ title: `${chapterName} — revision & doubt session`, type: 'revision' });
  // Tail days cover everything taught in the block so far — with tail always trailing every
  // explain day, that's simply every unit in the tree.
  if (allTags) tail.forEach((t) => Object.assign(t, allTags));

  const explainCount = Math.max(1, totalDays - tail.length);
  const explainDays: PlannerDayTask[] = [];

  if (units.length > 0) {
    const buckets = distributeUnitsAcrossDays(units, explainCount);
    // Track which "part" of a repeated unit each bucket represents (only relevant when days
    // outnumber units and the same unit gets more than one day).
    const seenCount = new Map<string, number>();
    const totalForUnit = new Map<string, number>();
    for (const bucket of buckets) {
      if (bucket.length === 1) {
        const key = bucket[0].subtopicId ?? bucket[0].topicId;
        totalForUnit.set(key, (totalForUnit.get(key) ?? 0) + 1);
      }
    }
    for (const bucket of buckets) {
      let occurrence = 1;
      let total = 1;
      if (bucket.length === 1) {
        const key = bucket[0].subtopicId ?? bucket[0].topicId;
        total = totalForUnit.get(key) ?? 1;
        occurrence = (seenCount.get(key) ?? 0) + 1;
        seenCount.set(key, occurrence);
      }
      explainDays.push({
        title: labelForDay(chapterName, bucket, occurrence, total),
        type: 'explain',
        ...tagsForUnits(bucket),
      });
    }
  } else {
    for (let i = 0; i < explainCount; i++) {
      if (i === 0) {
        explainDays.push({ title: `Introduction to ${chapterName}`, type: 'explain' });
      } else if (topics.length > 0) {
        explainDays.push({ title: `${chapterName}: ${topics[(i - 1) % topics.length]}`, type: 'explain' });
      } else {
        explainDays.push({ title: `${chapterName} — key concepts (part ${i + 1})`, type: 'explain' });
      }
    }
  }

  return [...explainDays, ...tail].slice(0, totalDays);
}
