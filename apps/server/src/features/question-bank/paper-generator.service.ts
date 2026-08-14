import { GeneratedPaper, GeneratedPaperSection, PaperGenerationConfig, Question as QuestionDto } from '@schoolos/types';
import { AuthContext } from '../../lib/auth-context';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import { chapterRepository } from './chapter.repository';
import { questionRepository } from './question.repository';
import { questionSourceRepository } from './question-source.repository';
import { questionExtractionService } from './question-extraction.service';
import { paperRepository } from './paper.repository';
import { paperValidationService } from './paper-validation.service';
import { IQuestion, QuestionDifficulty } from './question.model';
import { ISyllabusChapter } from './chapter.model';

function toDto(q: IQuestion): QuestionDto {
  return {
    _id: String(q._id),
    schoolId: q.schoolId,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    class: q.class,
    subject: q.subject,
    chapterId: q.chapterId,
    chapterName: q.chapterName,
    topic: q.topic,
    questionText: q.questionText,
    questionType: q.questionType,
    options: q.options,
    correctAnswer: q.correctAnswer,
    difficulty: q.difficulty,
    marks: q.marks,
    estimatedTimeMinutes: q.estimatedTimeMinutes,
    bloomsLevel: q.bloomsLevel,
    keywords: q.keywords,
    source: q.source,
    usageHistory: q.usageHistory.map((u) => ({ examId: u.examId, usedAt: u.usedAt.toISOString() })),
    createdBy: q.createdBy,
    isDeleted: q.isDeleted,
  };
}

/** Greedily fills each requested marks-bucket, preferring questions whose difficulty still has quota remaining and that have been used least recently. */
function selectQuestions(pool: IQuestion[], config: PaperGenerationConfig): IQuestion[] {
  const remaining: Record<QuestionDifficulty, number> = { ...config.difficultyMix };
  const selectedIds = new Set<string>();
  const selected: IQuestion[] = [];
  const typeFilter = new Set(config.questionTypes);

  const sortedBreakdown = [...config.marksBreakdown].sort((a, b) => a.marks - b.marks);

  for (const entry of sortedBreakdown) {
    const candidates = pool.filter((q) =>
      q.marks === entry.marks
      && !selectedIds.has(String(q._id))
      && (typeFilter.size === 0 || typeFilter.has(q.questionType)),
    );

    candidates.sort((a, b) => {
      const aPriority = remaining[a.difficulty] > 0 ? 0 : 1;
      const bPriority = remaining[b.difficulty] > 0 ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.usageHistory.length - b.usageHistory.length;
    });

    const take = candidates.slice(0, entry.count);
    for (const q of take) {
      selectedIds.add(String(q._id));
      selected.push(q);
      if (remaining[q.difficulty] > 0) remaining[q.difficulty] -= 1;
    }
  }

  return selected;
}

/**
 * Fills any marks-bucket the pool couldn't satisfy exactly by asking the AI to write new
 * questions for it (see questionExtractionService.synthesizeQuestions) — the requested marks
 * value is never treated as a reason to come back empty; only a fully unconfigured/unavailable
 * AI provider does, and even then paper generation itself doesn't hard-fail unless the pool is
 * also completely empty.
 */
async function fillMarksGapsWithAi(
  pool: IQuestion[],
  selected: IQuestion[],
  chapters: ISyllabusChapter[],
  config: PaperGenerationConfig,
  ctx: AuthContext,
): Promise<IQuestion[]> {
  const actualByMarks = new Map<number, number>();
  for (const q of selected) actualByMarks.set(q.marks, (actualByMarks.get(q.marks) ?? 0) + 1);

  const sources = await questionSourceRepository.findAll(ctx.schoolId, config.class, config.subject).catch(() => []);

  // Decide every shortfall's target chapter + context up front, from the pool/selected state
  // before any synthesis call runs — then fire all the AI calls in parallel. This used to be a
  // sequential await-in-loop, so a paper with several unfilled marks rows took one AI call's
  // worth of time *per row*; parallelizing means it now takes roughly one call's worth of time
  // total. Deciding chapter targets after the fact (post-await) would race across concurrent
  // calls, so the "least covered chapter" tally is provisionally updated as each task is planned
  // rather than waiting for its questions to actually be written.
  const marksByChapter = new Map<string, number>();
  for (const q of selected) marksByChapter.set(q.chapterId, (marksByChapter.get(q.chapterId) ?? 0) + 1);

  interface Task {
    marks: number;
    count: number;
    chapter: ISyllabusChapter;
    contextText: string;
    questionType?: PaperGenerationConfig['questionTypes'][number];
  }
  const tasks: Task[] = [];

  for (const entry of config.marksBreakdown) {
    const have = actualByMarks.get(entry.marks) ?? 0;
    const short = entry.count - have;
    if (short <= 0) continue;

    // Attribute new questions to whichever requested chapter is least covered so far —
    // keeps the AI-filled gap spread across the paper's actual chapter selection.
    const chapter = [...chapters].sort((a, b) => (marksByChapter.get(String(a._id)) ?? 0) - (marksByChapter.get(String(b._id)) ?? 0))[0];
    if (!chapter) continue;
    marksByChapter.set(String(chapter._id), (marksByChapter.get(String(chapter._id)) ?? 0) + short);

    const contextQuestions = pool.filter((q) => q.chapterId === String(chapter._id)).map((q) => q.questionText).slice(0, 10);
    const contextSourceText = sources.filter((s) => s.chapterName === chapter.chapterName).map((s) => s.extractedText).join('\n\n');
    const contextText = [...contextQuestions, contextSourceText].filter(Boolean).join('\n\n')
      || `Chapter topics: ${chapter.topics.join(', ') || chapter.chapterName}`;

    const questionType = config.questionTypes.length === 1 ? config.questionTypes[0] : undefined;
    tasks.push({ marks: entry.marks, count: short, chapter, contextText, questionType });
  }

  if (tasks.length === 0) return [];

  const results = await Promise.allSettled(tasks.map((task) =>
    questionExtractionService.synthesizeQuestions(
      { class: config.class, subject: config.subject, chapterName: task.chapter.chapterName, marks: task.marks, count: task.count, questionType: task.questionType, contextText: task.contextText },
      ctx,
    ),
  ));

  const created: IQuestion[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const result = results[i];

    if (result.status === 'rejected') {
      // AI synthesis failing shouldn't take down paper generation — the pre-existing shortfall
      // warning from paper-validation.service still surfaces to the teacher either way.
      logger.error('[PaperGenerator] AI question synthesis failed for a marks gap', {
        schoolId: ctx.schoolId, chapterId: String(task.chapter._id), marks: task.marks,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      continue;
    }

    const drafts = result.value;
    if (drafts.length === 0) continue;

    const newQuestions = await questionRepository.createMany(drafts.map((d) => ({
      schoolId: ctx.schoolId,
      class: config.class,
      subject: config.subject,
      chapterId: String(task.chapter._id),
      chapterName: task.chapter.chapterName,
      topic: d.topic,
      questionText: d.questionText,
      questionType: d.questionType,
      options: d.options,
      correctAnswer: d.correctAnswer,
      difficulty: d.difficulty,
      marks: task.marks,
      estimatedTimeMinutes: d.estimatedTimeMinutes,
      bloomsLevel: d.bloomsLevel,
      keywords: d.keywords,
      source: 'AI-generated to complete a paper request',
      createdBy: ctx.userId,
    })));

    created.push(...newQuestions);
    selected.push(...newQuestions);
    pool.push(...newQuestions);
  }

  return created;
}

export const paperGeneratorService = {
  async generate(config: PaperGenerationConfig, ctx: AuthContext): Promise<GeneratedPaper> {
    const chapters = await chapterRepository.findByIds(ctx.schoolId, config.chapterIds);
    if (chapters.length === 0) throw new ValidationError('No matching chapters found for this class/subject');

    const pool = await questionRepository.findEligible(ctx.schoolId, config.class, config.subject, config.chapterIds);

    const selected = selectQuestions(pool, config);
    await fillMarksGapsWithAi(pool, selected, chapters, config, ctx);

    if (selected.length === 0) {
      throw new ValidationError('No questions in the bank for the selected class/subject/chapters yet, and AI question generation is not configured on this server — upload sources first.');
    }

    const validation = paperValidationService.validate(config, chapters, selected);

    const sectionsByMarks = new Map<number, IQuestion[]>();
    for (const q of selected) {
      const bucket = sectionsByMarks.get(q.marks) ?? [];
      bucket.push(q);
      sectionsByMarks.set(q.marks, bucket);
    }
    const sections: GeneratedPaperSection[] = [...sectionsByMarks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([marks, questions]) => ({ marks, questions: questions.map(toDto) }));

    const totalMarksAssembled = selected.reduce((sum, q) => sum + q.marks, 0);

    const record = await paperRepository.create({
      schoolId: ctx.schoolId,
      config,
      questionIds: selected.map((q) => String(q._id)),
      totalMarksAssembled,
      validation,
      createdBy: ctx.userId,
    });

    await questionRepository.recordUsage(selected.map((q) => String(q._id)), undefined, new Date());

    return {
      _id: String(record._id),
      schoolId: record.schoolId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      config,
      sections,
      totalMarksAssembled,
      validation,
      createdBy: ctx.userId,
    };
  },

  /** Re-hydrates a previously generated paper (e.g. for the print-preview page after a page refresh). */
  async getById(id: string, ctx: AuthContext): Promise<GeneratedPaper> {
    const record = await paperRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Generated paper');

    const questions = await questionRepository.findByIds(ctx.schoolId, record.questionIds);
    const byId = new Map(questions.map((q) => [String(q._id), q]));
    const ordered = record.questionIds.map((qid) => byId.get(qid)).filter((q): q is IQuestion => !!q);

    const sectionsByMarks = new Map<number, IQuestion[]>();
    for (const q of ordered) {
      const bucket = sectionsByMarks.get(q.marks) ?? [];
      bucket.push(q);
      sectionsByMarks.set(q.marks, bucket);
    }
    const sections: GeneratedPaperSection[] = [...sectionsByMarks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([marks, qs]) => ({ marks, questions: qs.map(toDto) }));

    return {
      _id: String(record._id),
      schoolId: record.schoolId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      config: record.config,
      sections,
      totalMarksAssembled: record.totalMarksAssembled,
      validation: record.validation,
      createdBy: record.createdBy,
    };
  },
};
