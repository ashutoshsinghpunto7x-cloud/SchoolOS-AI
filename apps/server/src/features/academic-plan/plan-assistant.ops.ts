// ── Planner assistant operations ─────────────────────────────────────────────
// The language model never writes to the database. It only proposes a list of
// the operations below; this module validates them against the real plan and
// works out the resulting days. The preview shown to the user and the save use
// this same function, so what they approve is exactly what gets written.

import { z } from 'zod';
import type { IAcademicPlanDay, IAcademicPlanMonthlyRow } from './academic-plan.model';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const text = (max: number) => z.string().trim().max(max).optional();

export const planOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('edit_day'),
    date: dateKey,
    blockType: z.enum(['teach', 'revision', 'buffer']).optional(),
    chapterName: text(200),
    topicTitle: text(300),
    periodLabel: text(20),
    classWork: text(1000),
    homeWork: text(1000),
    teachingAid: text(500),
    remarks: text(500),
  }),
  z.object({ type: z.literal('swap_days'), fromDate: dateKey, toDate: dateKey }),
  z.object({
    type: z.literal('set_status'),
    date: dateKey,
    status: z.enum(['pending', 'completed', 'partial', 'needs_extra_class']),
  }),
  z.object({ type: z.literal('postpone'), fromDate: dateKey, by: z.number().int().min(1).max(10) }),
  z.object({
    type: z.literal('monthly_row'),
    monthKey: z.string().regex(/^\d{4}-\d{2}$/),
    chapterName: z.string().trim().min(1).max(200),
    teachingMethod: text(1500),
    teachingAid: text(500),
    classWork: text(1000),
    homeWork: text(1000),
  }),
]);

export type PlanOperation = z.infer<typeof planOperationSchema>;

export const MAX_OPERATIONS = 60;

export interface PlanChange {
  /** 'YYYY-MM-DD' for a day, 'YYYY-MM' for a monthly planner row. */
  date: string;
  label: string;
  before: string;
  after: string;
}

export interface ChapterRef {
  id: string;
  name: string;
}

export interface ApplyInput {
  days: IAcademicPlanDay[];
  monthlyRows: IAcademicPlanMonthlyRow[];
  operations: PlanOperation[];
  chapters: ChapterRef[];
  /** The calendar date the user sees on screen for a stored day. */
  dateKeyOf: (date: Date) => string;
  /** Next open teaching slot after a date, for carrying unfinished work forward. */
  nextOpenDate?: (after: Date, taken: Date[]) => Date | null;
}

export interface ApplyResult {
  days: IAcademicPlanDay[];
  monthlyRows: IAcademicPlanMonthlyRow[];
  changes: PlanChange[];
  /** Reasons an operation could not be done. Non-empty means nothing should be saved. */
  errors: string[];
}

const DAY_FIELDS: { key: keyof IAcademicPlanDay; label: string }[] = [
  { key: 'blockType', label: 'Lesson type' },
  { key: 'chapterName', label: 'Chapter' },
  { key: 'examName', label: 'Exam' },
  { key: 'topicTitle', label: 'Topic' },
  { key: 'periodLabel', label: 'Period' },
  { key: 'classWork', label: 'Class-work' },
  { key: 'homeWork', label: 'Home-work' },
  { key: 'teachingAid', label: 'Teaching aid' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'status', label: 'Status' },
];

const MONTHLY_FIELDS = [
  { key: 'teachingMethod', label: 'Teaching method' },
  { key: 'teachingAid', label: 'Teaching aid' },
  { key: 'classWork', label: 'Class-work' },
  { key: 'homeWork', label: 'Home-work' },
] as const;

const VALUE_LABELS: Record<string, string> = {
  teach: 'Lesson', revision: 'Revision', assessment: 'Exam', buffer: 'Free period',
  pending: 'Pending', completed: 'Completed', partial: 'Partly done',
  carried_forward: 'Carried forward', needs_extra_class: 'Needs extra class',
};

/** What travels with a lesson when it moves to another date (status and period stay with the date). */
const CONTENT_KEYS = [
  'blockType', 'chapterId', 'chapterName', 'topicTitle', 'examId', 'examName',
  'classWork', 'homeWork', 'teachingAid', 'remarks',
] as const;

type DayContent = Pick<IAcademicPlanDay, (typeof CONTENT_KEYS)[number]>;

function contentOf(day: IAcademicPlanDay): DayContent {
  return Object.fromEntries(CONTENT_KEYS.map((k) => [k, day[k]])) as DayContent;
}

function setContent(day: IAcademicPlanDay, content: DayContent): void {
  Object.assign(day, content, { manuallyEdited: true });
}

function isEmptyBuffer(c: DayContent): boolean {
  return c.blockType === 'buffer' && !c.chapterName && !c.topicTitle && !c.classWork && !c.homeWork;
}

function show(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const s = String(value);
  return VALUE_LABELS[s] ?? s;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function applyPlanOperations(input: ApplyInput): ApplyResult {
  const { operations, chapters, dateKeyOf } = input;
  const days: IAcademicPlanDay[] = input.days.map((d) => ({ ...d }));
  const monthlyRows: IAcademicPlanMonthlyRow[] = input.monthlyRows.map((r) => ({ ...r }));
  const errors: string[] = [];
  const monthlyChanges: PlanChange[] = [];

  const indexByKey = new Map<string, number>();
  days.forEach((d, i) => indexByKey.set(dateKeyOf(new Date(d.date)), i));

  const findDay = (key: string): IAcademicPlanDay | null => {
    const i = indexByKey.get(key);
    if (i === undefined) {
      errors.push(`There is no period on ${key} in this plan.`);
      return null;
    }
    if (days[i].blockType === 'assessment') {
      errors.push(`${key} is set by an exam's own dates, so it can't be changed here.`);
      return null;
    }
    return days[i];
  };

  for (const op of operations) {
    if (op.type === 'edit_day') {
      const day = findDay(op.date);
      if (!day) continue;

      if (op.chapterName) {
        const chapter = chapters.find((c) => sameName(c.name, op.chapterName!));
        if (!chapter) {
          errors.push(`I couldn't find a chapter called "${op.chapterName}" for this subject.`);
          continue;
        }
        if (!day.chapterName || !sameName(day.chapterName, chapter.name)) {
          day.chapterId = chapter.id || undefined;
          day.chapterName = chapter.name;
          // The old topic belonged to the old chapter.
          if (op.topicTitle === undefined) day.topicTitle = '';
        }
        if (op.blockType === undefined && day.blockType === 'buffer') day.blockType = 'teach';
      }

      if (op.blockType !== undefined) {
        day.blockType = op.blockType;
        if (op.blockType === 'buffer') {
          day.chapterId = undefined;
          day.chapterName = undefined;
          day.topicTitle = undefined;
        }
        if (op.blockType !== 'revision') {
          day.examId = undefined;
          day.examName = undefined;
        }
      }

      for (const key of ['topicTitle', 'periodLabel', 'classWork', 'homeWork', 'teachingAid', 'remarks'] as const) {
        const value = op[key];
        if (value !== undefined) day[key] = value;
      }
      day.manuallyEdited = true;
    } else if (op.type === 'swap_days') {
      const a = findDay(op.fromDate);
      const b = findDay(op.toDate);
      if (!a || !b) continue;
      if (isEmptyBuffer(contentOf(a)) && isEmptyBuffer(contentOf(b))) {
        errors.push(`${op.fromDate} and ${op.toDate} are both free periods, so there is nothing to swap.`);
        continue;
      }
      const contentA = contentOf(a);
      setContent(a, contentOf(b));
      setContent(b, contentA);
    } else if (op.type === 'set_status') {
      const day = findDay(op.date);
      if (!day) continue;
      if (day.blockType === 'buffer') {
        errors.push(`${op.date} is a free period, so there is no lesson to mark.`);
        continue;
      }
      if (day.status === op.status) continue;
      day.status = op.status;

      const unfinished = op.status === 'partial' || op.status === 'needs_extra_class';
      if (unfinished && day.blockType === 'teach' && input.nextOpenDate) {
        const date = new Date(day.date);
        const next = input.nextOpenDate(date, days.map((d) => new Date(d.date)));
        if (next) {
          days.push({
            date: next, blockType: 'teach', chapterId: day.chapterId, chapterName: day.chapterName,
            topicTitle: day.topicTitle, status: 'pending', carriedFromDate: date,
          });
          indexByKey.set(dateKeyOf(next), days.length - 1);
        }
      }
    } else if (op.type === 'postpone') {
      const start = findDay(op.fromDate);
      if (!start) continue;
      if (isEmptyBuffer(contentOf(start))) {
        errors.push(`${op.fromDate} is a free period, so there is no lesson to push forward.`);
        continue;
      }
      const from = new Date(start.date).getTime();
      // Exams, revision windows and finished lessons stay where they are.
      const slots = days
        .filter((d) => new Date(d.date).getTime() >= from
          && (d.blockType === 'teach' || d.blockType === 'buffer')
          && d.status !== 'completed')
        .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());

      if (slots[0] !== start) {
        errors.push(`The lesson on ${op.fromDate} can't be pushed forward (it is finished or tied to an exam).`);
        continue;
      }

      const queue: DayContent[] = slots.map(contentOf);
      let absorbed = 0;
      for (let i = 0; i < queue.length && absorbed < op.by; ) {
        if (isEmptyBuffer(queue[i])) {
          queue.splice(i, 1);
          absorbed += 1;
        } else {
          i += 1;
        }
      }
      if (absorbed < op.by) {
        errors.push(
          `There ${absorbed === 1 ? 'is only 1 free period' : `are only ${absorbed} free periods`} after ${op.fromDate}, ` +
          `so the lessons can't be pushed forward by ${op.by}.`,
        );
        continue;
      }
      // A free period with every other lesson field cleared.
      const blank: DayContent = { ...contentOf({ blockType: 'buffer' } as IAcademicPlanDay) };
      const gap: DayContent[] = Array.from({ length: op.by }, () => ({ ...blank }));
      [...gap, ...queue].forEach((content, i) => {
        const slot = slots[i];
        if (CONTENT_KEYS.some((k) => show(slot[k]) !== show(content[k]))) setContent(slot, content);
      });
    } else {
      const inMonth = days.find((d) => (d.blockType === 'teach' || d.blockType === 'revision')
        && new Date(d.date).toISOString().slice(0, 7) === op.monthKey
        && sameName(d.chapterName ?? (d.blockType === 'revision' ? 'Revision' : ''), op.chapterName));
      if (!inMonth) {
        errors.push(`"${op.chapterName}" is not scheduled in ${op.monthKey}.`);
        continue;
      }
      const name = inMonth.chapterName ?? 'Revision';
      let row = monthlyRows.find((r) => r.monthKey === op.monthKey && sameName(r.chapterName, name));
      if (!row) {
        row = { monthKey: op.monthKey, chapterName: name };
        monthlyRows.push(row);
      }
      for (const { key, label } of MONTHLY_FIELDS) {
        const value = op[key];
        if (value === undefined || show(row[key]) === value) continue;
        monthlyChanges.push({ date: op.monthKey, label: `${name} · ${label}`, before: show(row[key]), after: value });
        row[key] = value;
      }
    }
  }

  const changes: PlanChange[] = [];
  days.forEach((day, i) => {
    const key = dateKeyOf(new Date(day.date));
    const old = input.days[i];
    if (!old) {
      changes.push({
        date: key, label: 'New period for unfinished work', before: '',
        after: [day.chapterName, day.topicTitle].filter(Boolean).join(' — '),
      });
      return;
    }
    for (const field of DAY_FIELDS) {
      const before = show(old[field.key]);
      const after = show(day[field.key]);
      if (before !== after) changes.push({ date: key, label: field.label, before, after });
    }
  });
  changes.sort((a, b) => a.date.localeCompare(b.date));

  return { days, monthlyRows, changes: [...changes, ...monthlyChanges], errors };
}
