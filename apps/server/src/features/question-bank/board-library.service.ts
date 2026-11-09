import { z } from 'zod';
import { AuthContext } from '../../lib/auth-context';
import { classNameKey } from '../../lib/class-name';
import { NotFoundError } from '../../middlewares/errorHandler';
import { BoardPaper, IBoardPaperQuestion } from './board-library.model';
import { chapterRepository } from './chapter.repository';
import { questionRepository, CreateQuestionData } from './question.repository';
import { assertTeacherCanAccessQuestionBank } from './question-bank.service';
import type { BloomsLevel, QuestionDifficulty } from './question.model';

export const syncBoardLibrarySchema = z.object({
  class: z.string().min(1),
  subject: z.string().min(1),
});

export const listBoardLibrarySchema = z.object({
  class: z.string().min(1).optional(),
});

function defaultDifficulty(q: IBoardPaperQuestion): QuestionDifficulty {
  if (q.difficulty) return q.difficulty;
  if (q.marks <= 1) return 'easy';
  if (q.marks <= 3) return 'medium';
  return 'hard';
}

function defaultBlooms(q: IBoardPaperQuestion): BloomsLevel {
  if (q.marks <= 1) return 'remember';
  if (q.marks <= 3) return 'understand';
  return 'apply';
}

function estimateMinutes(marks: number): number {
  if (marks <= 1) return 1;
  if (marks <= 2) return 3;
  if (marks <= 3) return 5;
  return 10;
}

export const boardLibraryService = {
  /** Which board-paper subjects exist for a class, and how many papers/questions each has. */
  async listAvailable(rawQuery: unknown) {
    const { class: cls } = listBoardLibrarySchema.parse(rawQuery);
    const match: Record<string, unknown> = {};
    if (cls) match.class = classNameKey(cls);
    const papers = await BoardPaper.find(match).select('board class subject year questions').lean();
    const bySubject = new Map<string, { board: string; class: string; subject: string; years: number[]; questionCount: number }>();
    for (const p of papers) {
      const key = `${p.board}|${p.class}|${p.subject}`;
      const row = bySubject.get(key) ?? { board: p.board, class: p.class, subject: p.subject, years: [], questionCount: 0 };
      row.years.push(p.year);
      row.questionCount += p.questions.length;
      bySubject.set(key, row);
    }
    return [...bySubject.values()]
      .map((r) => ({ ...r, years: r.years.sort() }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  },

  /**
   * Copies the shared previous-year papers for one class+subject into this school's own bank.
   * Idempotent: each paper becomes one chapter ("UP Board 2025 – Previous Year Paper") and a
   * question already present in that chapter (same text) is skipped, so re-running adds only
   * what's new. After this, the existing Paper/Worksheet generators see the questions like any
   * other chapter's — nothing in them knows the library exists.
   */
  async syncToSchool(rawInput: unknown, ctx: AuthContext) {
    const input = syncBoardLibrarySchema.parse(rawInput);
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, input.class, input.subject);

    const papers = await BoardPaper.find({ class: classNameKey(input.class), subject: input.subject }).sort({ year: -1 }).lean();
    if (papers.length === 0) {
      throw new NotFoundError('No board papers are available in the shared library for this class and subject yet');
    }

    let chaptersTouched = 0;
    let questionsAdded = 0;
    for (const paper of papers) {
      const chapterName = `${paper.board} ${paper.year} – Previous Year Paper`;
      const chapter = await chapterRepository.findOrCreate(ctx.schoolId, input.class, input.subject, chapterName);
      const existing = await questionRepository.findExistingTexts(
        ctx.schoolId, String(chapter._id), paper.questions.map((q) => q.questionText),
      );
      // Figure-dependent questions are skipped: the diagram wasn't transcribed, so a paper containing one would be unanswerable.
      const fresh = paper.questions.filter((q) => !q.hasFigure && !existing.has(q.questionText.trim().toLowerCase()));
      if (fresh.length === 0) continue;

      const rows: CreateQuestionData[] = fresh.map((q) => ({
        schoolId: ctx.schoolId,
        class: input.class,
        subject: input.subject,
        chapterId: String(chapter._id),
        chapterName: chapter.chapterName,
        topic: q.chapterName,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: defaultDifficulty(q),
        marks: q.marks,
        estimatedTimeMinutes: estimateMinutes(q.marks),
        bloomsLevel: defaultBlooms(q),
        keywords: [],
        source: `${paper.board} ${paper.year}${q.number ? ` · Q${q.number}` : ''}`,
        createdBy: ctx.userId,
      }));
      await questionRepository.createMany(rows);
      chaptersTouched += 1;
      questionsAdded += rows.length;
    }
    return { papers: papers.length, chaptersTouched, questionsAdded };
  },
};
