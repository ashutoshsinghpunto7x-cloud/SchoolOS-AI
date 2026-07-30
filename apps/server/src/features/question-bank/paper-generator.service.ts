import { GeneratedPaper, GeneratedPaperSection, PaperGenerationConfig, Question as QuestionDto } from '@schoolos/types';
import { AuthContext } from '../../lib/auth-context';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { chapterRepository } from './chapter.repository';
import { questionRepository } from './question.repository';
import { paperRepository } from './paper.repository';
import { paperValidationService } from './paper-validation.service';
import { IQuestion, QuestionDifficulty } from './question.model';

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

export const paperGeneratorService = {
  async generate(config: PaperGenerationConfig, ctx: AuthContext): Promise<GeneratedPaper> {
    const chapters = await chapterRepository.findByIds(ctx.schoolId, config.chapterIds);
    if (chapters.length === 0) throw new ValidationError('No matching chapters found for this class/subject');

    const pool = await questionRepository.findEligible(ctx.schoolId, config.class, config.subject, config.chapterIds);
    if (pool.length === 0) {
      throw new ValidationError('No questions in the bank for the selected class/subject/chapters yet — upload sources first.');
    }

    const selected = selectQuestions(pool, config);
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
