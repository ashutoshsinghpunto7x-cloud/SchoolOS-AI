/**
 * Saves the demo Maths teacher's exam papers, their questions (into the question
 * bank) and worksheets. Additive and idempotent: anything already saved is skipped.
 */
import { User } from '../../features/users/user.model';
import { SyllabusChapter } from '../../features/question-bank/chapter.model';
import { Question, BloomsLevel } from '../../features/question-bank/question.model';
import { GeneratedPaperModel } from '../../features/question-bank/paper.model';
import { Worksheet } from '../../features/worksheet-generator/worksheet.model';
import { SCHOOL_ID, TEACHERS, log } from './common';
import { PAPERS, WORKSHEETS, DemoQuestion } from './exam-content';

const PAPER_CLASS = '6';
const SUBJECT = 'Maths';
const SOURCE = 'Exam paper set';
const BLOOMS: Record<DemoQuestion['difficulty'], BloomsLevel> = { easy: 'remember', medium: 'apply', hard: 'analyze' };

interface Chapter { id: string; name: string }

async function chaptersOf(cls: string): Promise<Map<number, Chapter>> {
  const docs = await SyllabusChapter.find({ schoolId: SCHOOL_ID, class: cls, subject: SUBJECT }).lean();
  return new Map(docs.map((d) => [d.order ?? 0, { id: String(d._id), name: d.chapterName }]));
}

function chapterFor(map: Map<number, Chapter>, order: number): Chapter {
  const chapter = map.get(order);
  if (!chapter) throw new Error(`Maths chapter ${order} is missing — run the pitch-demo seed first`);
  return chapter;
}

export async function addExamPapersAndWorksheets(): Promise<void> {
  const teacher = await User.findOne({ schoolId: SCHOOL_ID, email: TEACHERS[0].email }).select('_id').lean();
  if (!teacher) throw new Error(`Demo teacher ${TEACHERS[0].email} not found — run the pitch-demo seed first`);
  const teacherId = String(teacher._id);

  // ── Exam papers ───────────────────────────────────────────────────────────
  const paperChapters = await chaptersOf(PAPER_CLASS);
  let papers = 0;
  // Saved last-to-first so the newest-first list reads Unit Test 1 … Annual.
  for (const paper of [...PAPERS].reverse()) {
    const exists = await GeneratedPaperModel.exists({
      schoolId: SCHOOL_ID, createdBy: teacherId, isDeleted: { $ne: true },
      'config.class': PAPER_CLASS, 'config.subject': SUBJECT, 'config.examType': paper.examType,
    });
    if (exists) continue;

    const rows = paper.sections.flatMap((section) => section.questions.map((q) => {
      const chapter = chapterFor(paperChapters, q.ch);
      return {
        schoolId: SCHOOL_ID, class: PAPER_CLASS, subject: SUBJECT, chapterId: chapter.id, chapterName: chapter.name,
        questionText: q.text, questionType: q.type, options: q.options, correctAnswer: q.answer, difficulty: q.difficulty,
        marks: section.marks, estimatedTimeMinutes: section.marks * 2, bloomsLevel: BLOOMS[q.difficulty],
        keywords: ['maths', `class ${PAPER_CLASS}`, paper.examType.toLowerCase()], source: `${SOURCE} — ${paper.examType}`,
        usageHistory: [{ usedAt: new Date() }], createdBy: teacherId, isDeleted: false,
      };
    }));
    const saved = await Question.insertMany(rows);

    const questions = paper.sections.flatMap((s) => s.questions);
    const totalMarks = paper.sections.reduce((sum, s) => sum + s.marks * s.questions.length, 0);
    const difficultyMix = { easy: 0, medium: 0, hard: 0 };
    for (const q of questions) difficultyMix[q.difficulty] += 1;
    const marksCount = new Map<number, number>();
    for (const s of paper.sections) marksCount.set(s.marks, (marksCount.get(s.marks) ?? 0) + s.questions.length);

    await GeneratedPaperModel.create({
      schoolId: SCHOOL_ID,
      config: {
        class: PAPER_CLASS, subject: SUBJECT, examType: paper.examType,
        chapterIds: [...new Set(rows.map((r) => r.chapterId))],
        totalMarks, difficultyMix,
        marksBreakdown: [...marksCount].map(([marks, count]) => ({ marks, count })),
        sections: paper.sections.map((s) => ({
          name: s.name, marksEach: s.marks, count: s.questions.length,
          questionTypes: [...new Set(s.questions.map((q) => q.type))],
        })),
        questionTypes: [...new Set(questions.map((q) => q.type))],
        durationMinutes: paper.durationMinutes,
        includeAnswerKey: false,
      },
      questionIds: saved.map((q) => String(q._id)),
      sectionSizes: paper.sections.map((s) => s.questions.length),
      totalMarksAssembled: totalMarks,
      validation: { warnings: [], suggestions: [], coveragePercent: 100, totalEstimatedTimeMinutes: totalMarks * 2 },
      createdBy: teacherId,
    });
    papers++;
  }
  log(`  exam papers saved: ${papers} of ${PAPERS.length}`);

  // ── Worksheets ────────────────────────────────────────────────────────────
  let worksheets = 0;
  for (const ws of [...WORKSHEETS].reverse()) {
    const exists = await Worksheet.exists({ schoolId: SCHOOL_ID, teacherId, title: ws.title, isDeleted: { $ne: true } });
    if (exists) continue;

    const chapters = await chaptersOf(ws.cls);
    const used = [...new Set(ws.sections.flatMap((s) => s.questions.map((q) => q.ch)))].map((n) => chapterFor(chapters, n));
    await Worksheet.create({
      schoolId: SCHOOL_ID, teacherId, createdBy: teacherId, class: ws.cls, subject: SUBJECT,
      chapterIds: used.map((c) => c.id), chapterNames: used.map((c) => c.name),
      worksheetType: ws.worksheetType, title: ws.title,
      questions: ws.sections.flatMap((s) => s.questions.map((q) => ({
        questionText: q.text, questionType: q.type, options: q.options, difficulty: q.difficulty,
        marks: s.marks, estimatedTimeMinutes: s.marks * 2, keywords: ['maths', `class ${ws.cls}`],
      }))),
    });
    worksheets++;
  }
  log(`  worksheets saved: ${worksheets} of ${WORKSHEETS.length}`);
}
