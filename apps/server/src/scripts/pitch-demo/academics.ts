/**
 * Phase 2 — exams, marks, report-card templates + published term cards,
 * syllabus chapters, academic plans, teacher planners, question bank, mock tests.
 */
import { Exam } from '../../features/exams/exam.model';
import { Marks } from '../../features/marks/marks.model';
import { ReportCardTemplate } from '../../features/report-card-templates/report-card-template.model';
import { SyllabusChapter } from '../../features/question-bank/chapter.model';
import { Question } from '../../features/question-bank/question.model';
import { MockTest } from '../../features/mock-tests/mock-test.model';
import { TestAttempt } from '../../features/mock-tests/test-attempt.model';
import { AcademicPlan } from '../../features/academic-plan/academic-plan.model';
import { TeacherPlanner } from '../../features/teacher-planner/planner.model';
import { termReportCardService } from '../../features/term-report-cards/term-report-card.service';
import { academicPlanService } from '../../features/academic-plan/academic-plan.service';
import { plannerService } from '../../features/teacher-planner/planner.service';

import {
  SCHOOL_ID, ACADEMIC_YEAR, SUBJECTS, CLASSES, CLASS_SECTIONS, GRADING_BANDS,
  rand, randInt, gauss, clamp, gradeFor, utc, daysAgo, daysFromNow, ctxOf, log, iso,
} from './common';
import { World, StudentRef } from './core';

// ── Chapter catalogue (NCERT-style, per class × subject) ────────────────────
const CHAPTERS: Record<string, Record<string, string[]>> = {
  Maths: {
    '6': ['Knowing Our Numbers', 'Whole Numbers', 'Playing with Numbers', 'Basic Geometrical Ideas', 'Fractions', 'Decimals'],
    '7': ['Integers', 'Fractions and Decimals', 'Simple Equations', 'Lines and Angles', 'The Triangle and its Properties', 'Perimeter and Area'],
    '8': ['Rational Numbers', 'Linear Equations in One Variable', 'Understanding Quadrilaterals', 'Squares and Square Roots', 'Cubes and Cube Roots', 'Comparing Quantities'],
  },
  Science: {
    '6': ['Food: Where Does It Come From?', 'Components of Food', 'Fibre to Fabric', 'Sorting Materials into Groups', 'Separation of Substances', 'Changes Around Us'],
    '7': ['Nutrition in Plants', 'Nutrition in Animals', 'Heat', 'Acids, Bases and Salts', 'Physical and Chemical Changes', 'Respiration in Organisms'],
    '8': ['Crop Production and Management', 'Microorganisms: Friend and Foe', 'Synthetic Fibres and Plastics', 'Metals and Non-metals', 'Combustion and Flame', 'Force and Pressure'],
  },
  English: {
    '6': ['A Tale of Two Birds', 'The Friendly Mongoose', "The Shepherd's Treasure", "Taro's Reward", 'An Indian-American Woman in Space', 'A Different Kind of School'],
    '7': ['Three Questions', 'A Gift of Chappals', 'Gopal and the Hilsa-Fish', 'The Ashes That Made Trees Bloom', 'Quality', 'Expert Detectives'],
    '8': ['The Best Christmas Present in the World', 'The Tsunami', 'Glimpses of the Past', "Bepin Choudhury's Lapse of Memory", 'The Summit Within', "This is Jody's Fawn"],
  },
  Hindi: {
    '6': ['वह चिड़िया जो', 'बचपन', 'नादान दोस्त', 'चाँद से थोड़ी-सी गप्पें', 'अक्षरों का महत्व', 'पार नज़र के'],
    '7': ['हम पंछी उन्मुक्त गगन के', 'दादी माँ', 'हिमालय की बेटियाँ', 'कठपुतली', 'मिठाईवाला', 'रक्त और हमारा शरीर'],
    '8': ['ध्वनि', 'लाख की चूड़ियाँ', 'बस की यात्रा', 'दीवानों की हस्ती', 'चिट्ठियों की अनूठी दुनिया', 'भगवान के डाकिये'],
  },
  'Social Studies': {
    '6': ['What, Where, How and When?', 'From Hunting-Gathering to Growing Food', 'In the Earliest Cities', 'The Earth in the Solar System', 'Globe: Latitudes and Longitudes', 'Understanding Diversity'],
    '7': ['Tracing Changes Through a Thousand Years', 'New Kings and Kingdoms', 'The Delhi Sultans', 'Environment', 'Inside Our Earth', 'Our Changing Earth'],
    '8': ['How, When and Where', 'From Trade to Territory', 'Ruling the Countryside', 'Resources', 'Land, Soil, Water, Natural Vegetation and Wildlife Resources', 'The Indian Constitution'],
  },
};

const SUBJECT_BIAS: Record<string, number> = { Maths: -0.03, Science: 0.0, English: 0.03, Hindi: 0.04, 'Social Studies': 0.0 };

interface ExamPlan {
  key: string; name: string; type: 'unit_test' | 'half_yearly' | 'annual'; max: number; pass: number;
  start: Date; end: Date; status: 'configured' | 'locked'; marked: boolean; termLabel: string; termId: string;
}
const EXAMS: ExamPlan[] = [
  { key: 'ut1', name: 'Unit Test 1', type: 'unit_test', max: 20, pass: 7, start: utc(2026, 7, 20), end: utc(2026, 7, 24), status: 'locked', marked: true, termLabel: 'First Term', termId: 'term-1' },
  { key: 'ut2', name: 'Unit Test 2', type: 'unit_test', max: 20, pass: 7, start: utc(2026, 9, 7), end: utc(2026, 9, 11), status: 'locked', marked: true, termLabel: 'First Term', termId: 'term-1' },
  { key: 'hy', name: 'Half Yearly Examination', type: 'half_yearly', max: 80, pass: 27, start: utc(2026, 10, 5), end: utc(2026, 10, 14), status: 'locked', marked: true, termLabel: 'First Term', termId: 'term-1' },
  { key: 'ut3', name: 'Unit Test 3', type: 'unit_test', max: 20, pass: 7, start: utc(2026, 11, 16), end: utc(2026, 11, 20), status: 'configured', marked: true, termLabel: 'Final Term', termId: 'term-2' },
  { key: 'ut4', name: 'Unit Test 4', type: 'unit_test', max: 20, pass: 7, start: utc(2027, 1, 18), end: utc(2027, 1, 22), status: 'configured', marked: false, termLabel: 'Final Term', termId: 'term-2' },
  { key: 'an', name: 'Annual Examination', type: 'annual', max: 80, pass: 27, start: utc(2027, 3, 1), end: utc(2027, 3, 12), status: 'configured', marked: false, termLabel: 'Final Term', termId: 'term-2' },
];

export async function seedAcademics(world: World): Promise<void> {
  const principal = world.staff.principal;
  const principalCtx = ctxOf(principal._id, principal.name, 'principal');
  const teacherBySubject = new Map(world.teachers.map((t) => [t.plan.subject as string, t]));

  // ── Exams ─────────────────────────────────────────────────────────────────
  const examIds: Record<string, string> = {};
  for (const e of EXAMS) {
    const doc = await Exam.create({
      schoolId: SCHOOL_ID, name: e.name, examType: e.type, termLabel: e.termLabel, termId: e.termId,
      classesApplicable: CLASSES, subjects: [...SUBJECTS],
      components: [{ name: 'Theory', maxMarks: e.max, passMarks: e.pass, weight: 1 }],
      gradingBands: GRADING_BANDS, passPercent: 33, status: e.status, startDate: e.start, endDate: e.end,
      questionPaperDueDate: new Date(e.start.getTime() - 7 * 86400000), answerSheetDueDate: new Date(e.end.getTime() + 5 * 86400000),
      resultDate: new Date(e.end.getTime() + 10 * 86400000), createdBy: principal._id,
    });
    examIds[e.key] = doc._id.toString();
  }
  log(`  exams: ${EXAMS.length}`);

  // ── Marks ─────────────────────────────────────────────────────────────────
  const marksRows: Record<string, unknown>[] = [];
  for (const e of EXAMS.filter((x) => x.marked)) {
    for (const s of world.students) {
      for (const subj of SUBJECTS) {
        const t = teacherBySubject.get(subj)!;
        const pct = clamp(s.ability + SUBJECT_BIAS[subj] + gauss(0, 0.07), 0.2, 1);
        const score = Math.round(pct * e.max);
        const percentage = Math.round((score / e.max) * 1000) / 10;
        const pendingApproval = e.key === 'ut3' && s.cls === '8' && s.section === 'A' && subj === 'Hindi';
        const entered = new Date(e.end.getTime() + 2 * 86400000);
        marksRows.push({
          schoolId: SCHOOL_ID, examId: examIds[e.key], studentId: s._id, class: s.cls, section: s.section, subjectName: subj,
          componentScores: [{ componentName: 'Theory', score, status: 'present' }],
          total: score, percentage, grade: gradeFor(percentage), result: percentage >= 33 ? 'pass' : 'fail',
          workflowStatus: pendingApproval ? 'submitted' : 'published',
          enteredById: t._id, enteredByName: t.name, enteredByRole: 'teacher', enteredAt: entered,
          ...(pendingApproval ? {} : {
            approvedById: principal._id, approvedByName: principal.name, approvedAt: new Date(entered.getTime() + 86400000),
            publishedById: principal._id, publishedByName: principal.name, publishedAt: new Date(entered.getTime() + 2 * 86400000),
          }),
          auditTrail: [{ action: 'created', byUserId: t._id, byName: t.name, at: entered }],
          isDeleted: false,
        });
      }
    }
  }
  await Marks.insertMany(marksRows, { ordered: false });
  log(`  marks rows: ${marksRows.length}`);

  // ── Report-card templates (one per class) ─────────────────────────────────
  const slotFor = (keys: [string, string, string], start: Date, end: Date) => ({
    unitTest1ExamId: examIds[keys[0]], unitTest2ExamId: examIds[keys[1]], mainExamId: examIds[keys[2]],
    startDate: iso(start), endDate: iso(end),
  });
  for (const cls of CLASSES) {
    await ReportCardTemplate.create({
      schoolId: SCHOOL_ID, class: cls, academicYear: ACADEMIC_YEAR, status: 'published',
      subjects: SUBJECTS.map((name, order) => ({ name, marksSubjectName: name, evaluationType: 'marks', order, unitTestMaxMarks: 20, mainExamMaxMarks: 80 })),
      skillSections: [
        { name: 'Co-Scholastic Skills', order: 0, rows: ['Art & Craft', 'Music', 'Physical Education', 'Computer Literacy'].map((label, order) => ({ label, order })) },
        { name: 'Personality & Values', order: 1, rows: ['Discipline', 'Teamwork', 'Responsibility', 'Respect for Others'].map((label, order) => ({ label, order })) },
      ],
      gradingKey: GRADING_BANDS.map((b, order) => ({
        label: b.label, order, minPercent: b.minPercent, maxPercent: b.maxPercent,
        description: `${b.minPercent}% – ${b.maxPercent}%`,
      })),
      examSlots: {
        firstTerm: slotFor(['ut1', 'ut2', 'hy'], utc(2026, 4, 1), utc(2026, 10, 31)),
        finalTerm: slotFor(['ut3', 'ut4', 'an'], utc(2026, 11, 1), utc(2027, 3, 31)),
      },
      createdBy: principal._id, updatedBy: principal._id,
    });
  }

  // Generate + publish a term card for every student, via the real service so
  // ranks, class stats and verification QR tokens are all genuine.
  const t0 = Date.now();
  let generated = 0;
  const queue = [...world.students];
  async function worker() {
    for (;;) {
      const s = queue.shift();
      if (!s) return;
      try {
        const card = await termReportCardService.generate({ studentId: s._id, academicYear: ACADEMIC_YEAR }, principalCtx);
        await termReportCardService.publish(card._id.toString(), principalCtx);
        generated++;
      } catch (err) {
        console.warn(`  ! term card failed for ${s.fullName}: ${(err as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  log(`  term report cards generated+published: ${generated}/${world.students.length} in ${Math.round((Date.now() - t0) / 1000)}s`);

  // ── Syllabus chapters ─────────────────────────────────────────────────────
  const chapterDocs: Record<string, unknown>[] = [];
  const priorities = ['core', 'core', 'important', 'core', 'important', 'supplementary'] as const;
  const difficulties = ['easy', 'moderate', 'moderate', 'hard', 'moderate', 'easy'] as const;
  for (const subj of SUBJECTS) {
    for (const cls of CLASSES) {
      CHAPTERS[subj][cls].forEach((chapterName, order) => {
        const topics = ['Introduction and key terms', 'Core concepts', 'Applications and examples', 'Chapter review'];
        chapterDocs.push({
          schoolId: SCHOOL_ID, class: cls, subject: subj, chapterName, topics, order: order + 1, estimatedPeriods: 10 + (order % 3) * 2,
          difficulty: difficulties[order], priority: priorities[order], revisionWeight: 2 + (order % 3), extractionStatus: 'processed',
          topicTree: topics.map((name, ti) => ({
            topicId: `t${order + 1}-${ti + 1}`, name, order: ti + 1,
            subtopics: [{ subtopicId: `t${order + 1}-${ti + 1}-a`, name: `${name} — explained`, order: 1 }, { subtopicId: `t${order + 1}-${ti + 1}-b`, name: `${name} — practice`, order: 2 }],
          })),
        });
      });
    }
  }
  const insertedChapters = (await SyllabusChapter.insertMany(chapterDocs)) as unknown as { _id: { toString(): string }; class: string; subject: string; chapterName: string; topics: string[] }[];
  log(`  syllabus chapters: ${insertedChapters.length}`);

  // ── Question bank (template questions across every chapter) ───────────────
  const qs: Record<string, unknown>[] = [];
  const qTemplates: { type: string; text: (c: string) => string; marks: number; diff: 'easy' | 'medium' | 'hard'; bloom: string; options?: (c: string) => string[]; answer?: (c: string) => string }[] = [
    { type: 'mcq', text: (c) => `Which of the following best describes the central idea of "${c}"?`, marks: 1, diff: 'easy', bloom: 'remember', options: (c) => [`Introduction to ${c}`, 'An unrelated topic', 'A historical date', 'None of these'], answer: (c) => `Introduction to ${c}` },
    { type: 'mcq', text: (c) => `Identify the correct statement about "${c}".`, marks: 1, diff: 'medium', bloom: 'understand', options: () => ['Statement A is correct', 'Statement B is correct', 'Both are correct', 'Neither is correct'], answer: () => 'Both are correct' },
    { type: 'fill_blank', text: (c) => `Fill in the blank: The most important term introduced in "${c}" is ______.`, marks: 1, diff: 'easy', bloom: 'remember' },
    { type: 'true_false', text: (c) => `State whether true or false: "${c}" can be understood without the examples given in the textbook.`, marks: 1, diff: 'easy', bloom: 'understand', options: () => ['True', 'False'], answer: () => 'False' },
    { type: 'very_short', text: (c) => `Define the key term from "${c}" in one sentence.`, marks: 1, diff: 'easy', bloom: 'remember' },
    { type: 'short', text: (c) => `Write a short note on "${c}" in 3–4 lines.`, marks: 2, diff: 'medium', bloom: 'understand' },
    { type: 'short', text: (c) => `Give two examples from daily life related to "${c}".`, marks: 2, diff: 'medium', bloom: 'apply' },
    { type: 'long', text: (c) => `Explain "${c}" in detail with suitable examples.`, marks: 5, diff: 'hard', bloom: 'analyze' },
    { type: 'hots', text: (c) => `Why is "${c}" important? Justify your answer with reasoning.`, marks: 3, diff: 'hard', bloom: 'evaluate' },
    { type: 'application_based', text: (c) => `How would you apply the ideas of "${c}" to solve a problem in your own surroundings?`, marks: 3, diff: 'medium', bloom: 'apply' },
  ];
  for (const ch of insertedChapters) {
    const teacher = teacherBySubject.get(ch.subject)!;
    for (const [qi, tpl] of qTemplates.entries()) {
      qs.push({
        schoolId: SCHOOL_ID, class: ch.class, subject: ch.subject, chapterId: ch._id.toString(), chapterName: ch.chapterName,
        topic: ch.topics[qi % ch.topics.length], questionText: tpl.text(ch.chapterName), questionType: tpl.type,
        options: tpl.options?.(ch.chapterName), correctAnswer: tpl.answer?.(ch.chapterName), difficulty: tpl.diff, marks: tpl.marks,
        estimatedTimeMinutes: Math.max(1, tpl.marks * 2), bloomsLevel: tpl.bloom, keywords: [ch.subject.toLowerCase(), `class ${ch.class}`],
        source: 'Teacher upload', usageHistory: [], createdBy: teacher._id, isDeleted: false,
      });
    }
  }
  await Question.insertMany(qs, { ordered: false });
  log(`  questions: ${qs.length}`);

  // ── Academic plans (real engine) + planners ───────────────────────────────
  const today = new Date();
  let plans = 0;
  for (const t of world.teachers) {
    const ctx = ctxOf(t._id, t.name, 'teacher');
    for (const cs of CLASS_SECTIONS) {
      try {
        const { plan } = await academicPlanService.generate({ class: cs.cls, section: cs.section, subject: t.plan.subject }, ctx);
        const doc = await AcademicPlan.findById(plan._id);
        if (doc) {
          let n = 0;
          for (const day of doc.days) {
            if (day.blockType !== 'teach' || new Date(day.date) >= today) continue;
            n++;
            day.status = n % 23 === 0 ? 'partial' : 'completed';
            if (day.status === 'partial') day.note = 'Ran out of time — finishing in the next period.';
          }
          doc.markModified('days');
          await doc.save();
        }
        plans++;
      } catch (err) {
        console.warn(`  ! academic plan failed (${t.name} ${cs.cls}${cs.section}): ${(err as Error).message}`);
      }
    }
  }
  log(`  academic plans: ${plans}`);

  let planners = 0;
  for (const t of world.teachers) {
    const ctx = ctxOf(t._id, t.name, 'teacher');
    for (const cls of CLASSES) {
      const chapters = CHAPTERS[t.plan.subject][cls];
      const weeks = Array.from({ length: 36 }, (_, i) => {
        const chapterName = chapters[Math.min(chapters.length - 1, Math.floor(i / 6))];
        return {
          weekNumber: i + 1, chapterName, topic: 'Concepts, examples and practice',
          tasks: [
            { title: `Explain: ${chapterName} (part ${(i % 6) + 1})`, type: 'explain' as const },
            { title: 'In-class worksheet', type: 'worksheet' as const },
            { title: 'Homework: practice questions', type: 'homework' as const },
          ],
        };
      });
      try {
        const planner = await plannerService.confirmPlanner({ class: cls, subject: t.plan.subject, weeks }, ctx);
        const doc = await TeacherPlanner.findById(planner._id);
        if (doc) {
          for (const w of doc.weeks) {
            const wEnd = new Date(w.endDate);
            const done = wEnd < daysAgo(10) || (wEnd < today && rand() < 0.5);
            for (const task of w.tasks) {
              if (done && rand() < 0.93) { task.status = 'completed'; task.completedAt = new Date(task.dueDate); }
            }
          }
          doc.markModified('weeks');
          await doc.save();
        }
        planners++;
      } catch (err) {
        console.warn(`  ! planner failed (${t.name} class ${cls}): ${(err as Error).message}`);
      }
    }
  }
  log(`  teacher planners: ${planners}`);

  await seedMockTests(world, teacherBySubject);
}

// ── Mock tests ──────────────────────────────────────────────────────────────
const SCIENCE_MCQ: [string, string[], number][] = [
  ['Which gas do plants absorb during photosynthesis?', ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], 1],
  ['Which part of the plant makes food?', ['Root', 'Stem', 'Leaf', 'Flower'], 2],
  ['Which pigment gives leaves their green colour?', ['Chlorophyll', 'Melanin', 'Haemoglobin', 'Carotene'], 0],
  ['Which of these is an energy-giving food?', ['Rice', 'Spinach', 'Water', 'Salt'], 0],
  ['The process of breaking down food in the body is called', ['Digestion', 'Respiration', 'Excretion', 'Absorption'], 0],
  ['Which vitamin is produced in our skin with sunlight?', ['Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin K'], 2],
  ['Which organ pumps blood through the body?', ['Lungs', 'Heart', 'Kidney', 'Liver'], 1],
  ['Which of these is a good conductor of heat?', ['Wood', 'Plastic', 'Copper', 'Rubber'], 2],
  ['Acids turn blue litmus paper', ['Red', 'Green', 'Yellow', 'Colourless'], 0],
  ['Rusting of iron is a', ['Physical change', 'Chemical change', 'Reversible change', 'No change'], 1],
];
const ENGLISH_MCQ: [string, string[], number][] = [
  ['Choose the correct plural of "child".', ['Childs', 'Children', 'Childes', 'Childrens'], 1],
  ['Identify the noun: "The quick fox jumped."', ['quick', 'jumped', 'fox', 'The'], 2],
  ['Pick the correct sentence.', ['She go to school.', 'She goes to school.', 'She going to school.', 'She gone to school.'], 1],
  ['The opposite of "ancient" is', ['Old', 'Modern', 'Huge', 'Quiet'], 1],
  ['"Quickly" is a/an', ['Noun', 'Adjective', 'Adverb', 'Verb'], 2],
  ['Which is a synonym of "happy"?', ['Sad', 'Joyful', 'Angry', 'Tired'], 1],
  ['Fill in: He ___ playing football yesterday.', ['is', 'was', 'were', 'are'], 1],
  ['The past tense of "write" is', ['Writed', 'Wrote', 'Written', 'Writes'], 1],
  ['Which is a proper noun?', ['city', 'river', 'Delhi', 'school'], 2],
  ['"A piece of cake" means', ['Something very easy', 'Something sweet', 'A birthday', 'A small gift'], 0],
];
function mathsMcq(): [string, string[], number][] {
  const out: [string, string[], number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = randInt(2, 12); const b = randInt(2, 12);
    const correct = a * b;
    const opts = [correct, correct + randInt(1, 4), correct - randInt(1, 4), correct + 10].map(String);
    const idx = randInt(0, 3);
    [opts[0], opts[idx]] = [opts[idx], opts[0]];
    out.push([`What is ${a} × ${b}?`, opts, idx]);
  }
  return out;
}

async function seedMockTests(world: World, teacherBySubject: Map<string, { _id: string; name: string }>): Promise<void> {
  const principal = world.staff.principal;
  const build = (src: [string, string[], number][]) => src.map(([questionText, options, correctOptionIndex]) => ({ questionText, options, correctOptionIndex, marks: 1 }));

  interface Plan {
    title: string; cls: string; subject: string; status: string; mode: 'ranked' | 'anonymous'; start: Date; end: Date;
    questions: [string, string[], number][]; attempts: number; chapters: string[];
  }
  const plans: Plan[] = [
    { title: 'Tables & Multiplication Drill', cls: '6', subject: 'Maths', status: 'closed', mode: 'ranked', start: daysAgo(14), end: daysAgo(13), questions: mathsMcq(), attempts: 28, chapters: CHAPTERS.Maths['6'].slice(0, 2) },
    { title: 'Components of Food — Quick Quiz', cls: '6', subject: 'Science', status: 'closed', mode: 'anonymous', start: daysAgo(9), end: daysAgo(8), questions: SCIENCE_MCQ, attempts: 31, chapters: [CHAPTERS.Science['6'][1]] },
    { title: 'Nutrition & Respiration Check', cls: '7', subject: 'Science', status: 'live', mode: 'ranked', start: daysAgo(1), end: daysFromNow(2), questions: SCIENCE_MCQ, attempts: 9, chapters: [CHAPTERS.Science['7'][0], CHAPTERS.Science['7'][5]] },
    { title: 'Grammar Check-in', cls: '8', subject: 'English', status: 'approved', mode: 'ranked', start: daysFromNow(4), end: daysFromNow(5), questions: ENGLISH_MCQ, attempts: 0, chapters: [CHAPTERS.English['8'][0]] },
    { title: 'Linear Equations Mock', cls: '8', subject: 'Maths', status: 'pending_approval', mode: 'ranked', start: daysFromNow(7), end: daysFromNow(8), questions: mathsMcq(), attempts: 0, chapters: [CHAPTERS.Maths['8'][1]] },
    { title: 'Integers Practice Set', cls: '7', subject: 'Maths', status: 'pending_approval', mode: 'anonymous', start: daysFromNow(9), end: daysFromNow(10), questions: mathsMcq(), attempts: 0, chapters: [CHAPTERS.Maths['7'][0]] },
    { title: 'Reading Comprehension Starter', cls: '6', subject: 'English', status: 'draft', mode: 'anonymous', start: daysFromNow(12), end: daysFromNow(13), questions: ENGLISH_MCQ, attempts: 0, chapters: [CHAPTERS.English['6'][0]] },
  ];

  for (const p of plans) {
    const teacher = teacherBySubject.get(p.subject)!;
    const needsApproval = ['approved', 'live', 'closed'].includes(p.status);
    const test = await MockTest.create({
      schoolId: SCHOOL_ID, class: p.cls, subject: p.subject, chapterIds: [], chapterNames: p.chapters, title: p.title,
      questions: build(p.questions), durationMinutes: 20, scheduledStart: p.start, scheduledEnd: p.end, mode: p.mode,
      status: p.status, createdBy: teacher._id,
      submittedForApprovalAt: p.status === 'draft' ? undefined : daysAgo(16),
      approvedBy: needsApproval ? principal._id : undefined, approvedAt: needsApproval ? daysAgo(15) : undefined,
      anonymousSubmissionCount: 0,
    });

    if (p.attempts > 0) {
      const pool: StudentRef[] = world.students.filter((s) => s.cls === p.cls);
      const chosen = [...pool].sort(() => rand() - 0.5).slice(0, p.attempts);
      const rows = chosen.map((s) => {
        const answers = test.questions.map((q) => {
          const right = rand() < clamp(s.ability + 0.08, 0.2, 0.97);
          const wrong = (q.correctOptionIndex + randInt(1, q.options.length - 1)) % q.options.length;
          return { questionId: q._id.toString(), selectedOptionIndex: right ? q.correctOptionIndex : wrong };
        });
        const correct = answers.filter((a, i) => a.selectedOptionIndex === test.questions[i].correctOptionIndex).length;
        return {
          schoolId: SCHOOL_ID, testId: test._id.toString(), studentId: s._id, studentName: s.fullName, class: s.cls, section: s.section,
          answers, score: correct, totalMarks: test.questions.length, correctCount: correct, totalQuestions: test.questions.length,
          submittedAt: new Date(p.start.getTime() + randInt(10, 600) * 60000),
        };
      });
      await TestAttempt.insertMany(rows);
      if (p.mode === 'anonymous') {
        const avg = Math.round((rows.reduce((a, r) => a + r.score / r.totalMarks, 0) / rows.length) * 1000) / 10;
        await MockTest.updateOne({ _id: test._id }, { anonymousSubmissionCount: rows.length, anonymousAverageScorePercent: avg });
      }
    }
  }
  log(`  mock tests: ${plans.length}`);
}
