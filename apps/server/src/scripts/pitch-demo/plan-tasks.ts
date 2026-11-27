/**
 * Fills every DEMO_SCHOOL Academic Plan so the daily, weekly and monthly
 * checklists and notebook planners have no blank slots: chapters spread over
 * the whole year, notebook columns written, past lessons ticked, today and
 * later left for the teacher to tick.
 *
 * Only blanks are filled — hand-edited days keep their content, and a tick
 * that is already there stays.
 */
import { AcademicPlan, IAcademicPlanDay } from '../../features/academic-plan/academic-plan.model';
import { SyllabusChapter } from '../../features/question-bank/chapter.model';
import { Timetable } from '../../features/timetable/timetable.model';
import { PeriodSlot } from '../../features/timetable/timetable.period.model';
import { schoolDateKey } from '../../features/academic-plan/academic-plan.util';
import { SCHOOL_ID, log } from './common';

const TEACHING_AIDS: Record<string, string[]> = {
  Maths: ['Chalkboard and solved examples', 'Maths kit and grid paper', 'Number charts and flashcards'],
  Science: ['Textbook diagrams and wall chart', 'Lab kit demonstration', 'Specimens and a short video'],
  English: ['Textbook and read-aloud', 'Word cards', 'Audio reading and role play'],
  Hindi: ['Textbook and read-aloud', 'Word cards', 'Poem recitation chart'],
  'Social Studies': ['Wall map and globe', 'Timeline chart', 'Pictures and a short video'],
};

// One set of lesson text per stage of a chapter, in teaching order.
const STAGES: { classWork: (c: string) => string; homeWork: (c: string) => string }[] = [
  { classWork: (c) => `Introduce ${c}; note the key terms and one solved example.`, homeWork: (c) => `Write the key terms of ${c} with their meanings.` },
  { classWork: (c) => `Explain the main ideas of ${c}; practise in pairs.`, homeWork: (c) => `Textbook exercise on ${c}, questions 1–5.` },
  { classWork: (c) => `Work through examples from ${c}; group activity.`, homeWork: (c) => `Answer 5 application questions from ${c}.` },
  { classWork: (c) => `Review ${c}, clear doubts and take a short class test.`, homeWork: (c) => `Revise ${c} notes and correct test mistakes.` },
];

const REMARKS_DONE = ['Completed as planned.', 'Class followed well.', 'Notebooks checked.', 'Doubts cleared in class.'];
const REMARKS_AHEAD = ['Check homework at the start.', 'Keep 5 minutes for doubts.', 'Call on quieter pupils.', 'Collect notebooks.'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export async function fillDemoPlanTasks(now = new Date()): Promise<void> {
  const today = schoolDateKey(now);
  const plans = await AcademicPlan.find({ schoolId: SCHOOL_ID });
  const slotDocs = await PeriodSlot.find({ schoolId: SCHOOL_ID }).lean();
  const slotNumber = new Map(slotDocs.map((s) => [String(s._id), Number(/\d+/.exec(s.name)?.[0] ?? 0)]));

  for (const plan of plans) {
    const chapters = await SyllabusChapter.find({ schoolId: SCHOOL_ID, class: plan.class, subject: plan.subject })
      .sort({ order: 1 }).lean();
    if (chapters.length === 0) continue;
    const aids = TEACHING_AIDS[plan.subject] ?? TEACHING_AIDS.Maths;
    const days = [...plan.days].sort((a, b) => a.date.getTime() - b.date.getTime()) as IAcademicPlanDay[];

    // 1. Spread the syllabus over the whole year, so no month runs out of lessons.
    const slots = days.filter((d) => !d.manuallyEdited && (d.blockType === 'teach' || d.blockType === 'buffer'));
    const perChapter = slots.length / chapters.length;
    slots.forEach((day, i) => {
      const index = Math.min(chapters.length - 1, Math.floor(i / perChapter));
      const chapter = chapters[index];
      const topics = chapter.topics ?? [];
      const progress = (i - index * perChapter) / perChapter; // 0..1 through this chapter
      day.blockType = 'teach';
      day.chapterId = String(chapter._id);
      day.chapterName = chapter.chapterName;
      day.topicTitle = topics[Math.min(topics.length - 1, Math.max(0, Math.floor(progress * topics.length)))];
    });

    // A free day with nothing written on it takes the lesson next to it.
    days.forEach((day, i) => {
      if (day.blockType !== 'buffer' || day.chapterName || day.topicTitle || day.classWork) return;
      const near = [...days.slice(i + 1), ...days.slice(0, i).reverse()].find((d) => d.blockType === 'teach');
      if (!near) return;
      day.blockType = 'teach';
      day.chapterId = near.chapterId;
      day.chapterName = near.chapterName;
      day.topicTitle = near.topicTitle;
    });

    // Real period numbers from the timetable, per weekday.
    const timetable = await Timetable.findOne({ schoolId: SCHOOL_ID, class: plan.class, section: plan.section }).lean();
    const periodsOn = (weekday: number) => (timetable?.entries ?? [])
      .filter((e) => e.dayOfWeek === weekday && e.subjectName === plan.subject)
      .map((e) => slotNumber.get(e.slotId) ?? 0)
      .filter((n) => n > 0)
      .sort((a, b) => a - b)
      .map((n) => ROMAN[n - 1] ?? String(n))
      .join(', ');

    // 2. Tick past lessons and write the notebook columns.
    days.forEach((day, i) => {
      if (day.blockType === 'buffer') return;
      const past = schoolDateKey(day.date) < today;
      if (past && day.status === 'pending') day.status = 'completed';

      const subjectLine = day.chapterName ?? day.examName ?? plan.subject;
      const stage = STAGES[Math.max(0, ['Introduction', 'Core', 'Applications', 'Chapter review']
        .findIndex((s) => day.topicTitle?.startsWith(s)))];
      const exam = day.blockType === 'assessment';
      const periods = periodsOn(new Date(`${schoolDateKey(day.date)}T00:00:00Z`).getUTCDay());
      if (!day.manuallyEdited) day.periodLabel = periods;
      else day.periodLabel ||= periods;
      day.classWork ||= exam ? `Conduct ${day.examName ?? 'the assessment'}.`
        : day.blockType === 'revision' ? `Revise for ${day.examName ?? 'the coming exam'}; solve sample questions.`
          : stage.classWork(subjectLine);
      day.homeWork ||= exam ? 'No homework — rest and revise for the next paper.'
        : day.blockType === 'revision' ? 'Practise the revision worksheet.'
          : stage.homeWork(subjectLine);
      day.teachingAid ||= exam ? 'Question paper' : aids[i % aids.length];
      day.remarks ||= (past ? REMARKS_DONE : REMARKS_AHEAD)[i % REMARKS_DONE.length];
    });

    // 3. One Monthly Planner row per chapter per month.
    const have = new Set(plan.monthlyRows.map((r) => `${r.monthKey}|${r.chapterName}`));
    for (const day of days) {
      if (day.blockType !== 'teach' && day.blockType !== 'revision') continue;
      const chapterName = day.chapterName ?? (day.blockType === 'revision' ? 'Revision' : undefined);
      if (!chapterName) continue;
      const monthKey = schoolDateKey(day.date).slice(0, 7);
      if (have.has(`${monthKey}|${chapterName}`)) continue;
      have.add(`${monthKey}|${chapterName}`);
      plan.monthlyRows.push({
        monthKey, chapterName,
        teachingMethod: 'Explanation with examples, pair practice and a short quiz.',
        teachingAid: aids.slice(0, 2).join(', '),
        classWork: `Concept notes, solved examples and class exercises on ${chapterName}.`,
        homeWork: `Textbook exercises and one revision worksheet on ${chapterName}.`,
      });
    }

    plan.markModified('days');
    await plan.save();
  }
  log(`  academic plan tasks filled: ${plans.length} plans`);
}
