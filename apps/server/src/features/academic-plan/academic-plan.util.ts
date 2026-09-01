import { eventRepository } from '../events/event.repository';
import { timetableRepository } from '../timetable/timetable.repository';
import { classNameKey } from '../../lib/class-name';
import { IAcademicYear } from '../academic-year/academic-year.model';
import { ISyllabusChapter } from '../question-bank/chapter.model';
import { IExam } from '../exams/exam.model';

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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
    let guard = 0;
    while (cur <= last && guard < 60) {
      dates.add(isoDate(cur));
      cur.setDate(cur.getDate() + 1);
      guard += 1;
    }
  }
  return dates;
}

/** Weekdays (1=Mon..6=Sat, matching Timetable.entries[].dayOfWeek) on which
 *  the class/section actually has a period for this subject — real capacity,
 *  not an assumed uniform week (the gap Teacher Planner v2 had). Falls back
 *  to every non-weekly-off weekday, with a warning, when no timetable is
 *  found — so the engine still works for a school that hasn't built its
 *  timetable yet. */
async function loadSubjectWeekdays(
  schoolId: string,
  cls: string,
  section: string | undefined,
  subject: string,
  weeklyOffDays: number[],
  warnings: string[],
): Promise<Set<number>> {
  const allWeekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !weeklyOffDays.includes(d));

  if (!section) {
    warnings.push('No section given — assuming every non-off weekday has a period for this subject.');
    return new Set(allWeekdays);
  }

  const timetable = await timetableRepository.findByClassSectionAnyYear(schoolId, cls, section);
  if (!timetable) {
    warnings.push(`No timetable found for ${cls}-${section} — assuming every non-off weekday has a period for this subject.`);
    return new Set(allWeekdays);
  }

  const days = new Set(
    timetable.entries.filter((e) => e.subjectName === subject).map((e) => e.dayOfWeek),
  );
  if (days.size === 0) {
    warnings.push(`Timetable for ${cls}-${section} has no periods tagged "${subject}" — assuming every non-off weekday.`);
    return new Set(allWeekdays);
  }
  return days;
}

export interface EligibleDaysContext {
  weeklyOffDays: number[];
  holidayDates: Set<string>;
  specialOffDates: Set<string>;
  subjectWeekdays: Set<number>;
}

export async function buildEligibleDaysContext(
  schoolId: string,
  academicYear: IAcademicYear,
  cls: string,
  section: string | undefined,
  subject: string,
  warnings: string[],
): Promise<EligibleDaysContext> {
  const weeklyOffDays = academicYear.weeklyOffDays?.length ? academicYear.weeklyOffDays : [0, 6];
  const [holidayDates, subjectWeekdays] = await Promise.all([
    loadHolidayDates(schoolId, academicYear.startDate, academicYear.endDate),
    loadSubjectWeekdays(schoolId, cls, section, subject, weeklyOffDays, warnings),
  ]);

  const specialOffDates = new Set(
    (academicYear.specialDays ?? [])
      .filter((d) => d.teachingImpact === 'full_day_off')
      .map((d) => isoDate(new Date(d.date))),
  );

  return { weeklyOffDays, holidayDates, specialOffDates, subjectWeekdays };
}

export function isEligibleDay(ctx: EligibleDaysContext, date: Date): boolean {
  const key = isoDate(date);
  return (
    ctx.subjectWeekdays.has(date.getDay()) &&
    !ctx.holidayDates.has(key) &&
    !ctx.specialOffDates.has(key)
  );
}

/** Every eligible teaching day for this class/subject between start and end
 *  (inclusive), in order. */
export function listEligibleDays(ctx: EligibleDaysContext, start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    if (isEligibleDay(ctx, cur)) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** First eligible day strictly after `after` that isn't already in
 *  `excludeDates` — used for carry-forward, to find the next open slot for
 *  unfinished work. Searches up to `academicYear.endDate`. */
export function nextEligibleDay(
  ctx: EligibleDaysContext,
  after: Date,
  academicYearEnd: Date,
  excludeDates: Set<string>,
): Date | null {
  const cur = new Date(after);
  cur.setHours(0, 0, 0, 0);
  cur.setDate(cur.getDate() + 1);
  const last = new Date(academicYearEnd);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    if (isEligibleDay(ctx, cur) && !excludeDates.has(isoDate(cur))) return new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

/** True if this exam applies to the given class/subject — classesApplicable
 *  is matched via classNameKey the same way chapterRepository resolves
 *  class, since a school may store "8" in one feature and "VIII" in another
 *  (see [[project_planner_chapter_403_bug]]-style drift). */
export function examAppliesTo(exam: IExam, cls: string, subject: string): boolean {
  const clsKey = classNameKey(cls);
  return (
    exam.classesApplicable.some((c) => classNameKey(c) === clsKey) &&
    exam.subjects.includes(subject)
  );
}

export interface RevisionReservation {
  examId: string;
  examName: string;
  dates: Set<string>;
}

/** Walks backward from each dated, applicable exam's start date across
 *  eligible teaching days, reserving `revisionLeadDays` of them as revision
 *  — and also reserves the exam's own date range where it overlaps an
 *  eligible day (assessment block). This is the "Smart Revision" rule from
 *  the design doc: revision windows are a property of the exam calendar,
 *  computed, never manually scheduled. */
export function reserveExamBlocks(
  allEligibleDays: Date[],
  exams: IExam[],
  cls: string,
  subject: string,
): { revisionDates: Map<string, { examId: string; examName: string }>; assessmentDates: Map<string, { examId: string; examName: string }> } {
  const revisionDates = new Map<string, { examId: string; examName: string }>();
  const assessmentDates = new Map<string, { examId: string; examName: string }>();
  const eligibleKeys = allEligibleDays.map((d) => isoDate(d));

  for (const exam of exams) {
    if (!exam.startDate || !examAppliesTo(exam, cls, subject)) continue;
    const examId = String(exam._id);

    // Assessment block: exam's own date range, where it lands on an eligible day.
    const end = exam.endDate ?? exam.startDate;
    const cur = new Date(exam.startDate);
    while (cur <= end) {
      const key = isoDate(cur);
      if (eligibleKeys.includes(key)) assessmentDates.set(key, { examId, examName: exam.name });
      cur.setDate(cur.getDate() + 1);
    }

    // Revision block: last N eligible teaching days strictly before startDate.
    const leadDays = exam.revisionLeadDays ?? 0;
    if (leadDays <= 0) continue;
    const priorDays = allEligibleDays.filter((d) => d < exam.startDate!);
    const reserved = priorDays.slice(-leadDays);
    for (const d of reserved) {
      const key = isoDate(d);
      if (!assessmentDates.has(key)) revisionDates.set(key, { examId, examName: exam.name });
    }
  }

  return { revisionDates, assessmentDates };
}

export interface ChapterFillWarning {
  message: string;
}

export interface FilledDay {
  date: Date;
  chapterId: string;
  chapterName: string;
  topicTitle: string;
}

/** Distributes chapters across the remaining (non-revision, non-assessment)
 *  teaching days, in stored order, sized by `estimatedPeriods` when set —
 *  chapters missing an estimate split the days left after estimated
 *  chapters are placed, evenly among themselves. Reports chapters that
 *  didn't fully fit (or at all) as warnings rather than silently truncating,
 *  same spirit as Teacher Planner v2's generateDraft warnings. */
export function fillChaptersIntoDays(
  teachDays: Date[],
  chapters: ISyllabusChapter[],
): { filled: FilledDay[]; warnings: string[] } {
  const warnings: string[] = [];
  if (chapters.length === 0) {
    if (teachDays.length > 0) warnings.push('No chapters selected — teaching days were left unassigned.');
    return { filled: [], warnings };
  }

  const estimatedTotal = chapters.reduce((sum, c) => sum + (c.estimatedPeriods ?? 0), 0);
  const unestimatedCount = chapters.filter((c) => !c.estimatedPeriods).length;
  const daysForUnestimated = Math.max(0, teachDays.length - estimatedTotal);
  const perUnestimated = unestimatedCount > 0 ? Math.max(1, Math.floor(daysForUnestimated / unestimatedCount)) : 0;

  const filled: FilledDay[] = [];
  let cursor = 0;

  for (const chapter of chapters) {
    const span = chapter.estimatedPeriods ?? perUnestimated;
    const chapterId = String(chapter._id);
    const topics = chapter.topics ?? [];
    const daysLeft = teachDays.length - cursor;

    if (daysLeft <= 0) {
      warnings.push(`"${chapter.chapterName}" could not be scheduled — no teaching days left.`);
      continue;
    }
    const actualSpan = Math.min(span, daysLeft);
    if (actualSpan < span) {
      warnings.push(`"${chapter.chapterName}" needed ${span} period(s) but only ${actualSpan} were available before the next reserved/exam window.`);
    }

    for (let i = 0; i < actualSpan; i++) {
      const title = i === 0
        ? `Introduction to ${chapter.chapterName}`
        : topics.length > 0
          ? `${chapter.chapterName}: ${topics[(i - 1) % topics.length]}`
          : `${chapter.chapterName} — key concepts (part ${i + 1})`;
      filled.push({ date: teachDays[cursor], chapterId, chapterName: chapter.chapterName, topicTitle: title });
      cursor += 1;
    }
  }

  if (cursor < teachDays.length) {
    warnings.push(`${teachDays.length - cursor} teaching day(s) remain unassigned — add more chapters or raise their estimated periods.`);
  }

  return { filled, warnings };
}
