import { AuthContext } from '../../lib/auth-context';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { chapterRepository } from './chapter.repository';
import { questionRepository, QuestionListOptions } from './question.repository';
import { questionSourceRepository } from './question-source.repository';
import { questionExtractionService, flattenBlocksToText } from './question-extraction.service';
import { IQuestion } from './question.model';
import { ISyllabusChapter } from './chapter.model';
import { IQuestionSource } from './question-source.model';
import {
  ConfirmExtractedQuestionsInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  ListQuestionsInput,
  ListQuestionGroupsInput,
  ListSourcesInput,
  UpdateSourceInput,
  SaveChapterSourceInput,
} from './question-bank.validation';

export const questionBankService = {
  async listChapters(rawQuery: unknown, ctx: AuthContext): Promise<ISyllabusChapter[]> {
    const query = rawQuery as { class: string; subject: string };
    return chapterRepository.findAll(ctx.schoolId, query.class, query.subject);
  },

  async listQuestions(query: ListQuestionsInput, ctx: AuthContext) {
    const opts: QuestionListOptions = query;
    return questionRepository.findAll(ctx.schoolId, opts);
  },

  /** Chapter-grouped counts backing the Question Bank landing view (one row per class/subject/chapter). */
  async listQuestionGroups(query: ListQuestionGroupsInput, ctx: AuthContext) {
    return questionRepository.findGroups(ctx.schoolId, query);
  },

  async getQuestion(id: string, ctx: AuthContext): Promise<IQuestion> {
    const question = await questionRepository.findById(id, ctx.schoolId);
    if (!question) throw new NotFoundError('Question');
    return question;
  },

  async createQuestion(data: CreateQuestionInput, ctx: AuthContext): Promise<IQuestion> {
    const chapter = await chapterRepository.findOrCreate(ctx.schoolId, data.class, data.subject, data.chapterName, data.topic);

    return questionRepository.create({
      schoolId: ctx.schoolId,
      class: data.class,
      subject: data.subject,
      chapterId: String(chapter._id),
      chapterName: chapter.chapterName,
      topic: data.topic,
      questionText: data.questionText,
      questionType: data.questionType,
      options: data.options ?? undefined,
      correctAnswer: data.correctAnswer ?? undefined,
      difficulty: data.difficulty,
      marks: data.marks,
      estimatedTimeMinutes: data.estimatedTimeMinutes,
      bloomsLevel: data.bloomsLevel,
      keywords: data.keywords,
      source: data.source ?? undefined,
      createdBy: ctx.userId,
    });
  },

  /** Persists reviewed/edited AI-extracted draft questions — never called automatically, only on explicit teacher confirmation. */
  async confirmExtractedQuestions(data: ConfirmExtractedQuestionsInput, ctx: AuthContext): Promise<IQuestion[]> {
    // Resolved fresh per question (not cached by chapterName) — sequential
    // findOrCreate calls each see the previous iteration's topic additions,
    // so multiple questions sharing a chapter (even under slightly different
    // spellings) all land on one chapter row with a complete topics list.
    const toCreate = [];
    for (const q of data.questions) {
      const topic = q.topic ?? undefined;
      const chapter = await chapterRepository.findOrCreate(ctx.schoolId, data.class, data.subject, q.chapterName, topic);

      toCreate.push({
        schoolId: ctx.schoolId,
        class: data.class,
        subject: data.subject,
        chapterId: String(chapter._id),
        chapterName: chapter.chapterName,
        topic,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options ?? undefined,
        correctAnswer: q.correctAnswer ?? undefined,
        difficulty: q.difficulty,
        marks: q.marks,
        estimatedTimeMinutes: q.estimatedTimeMinutes,
        bloomsLevel: q.bloomsLevel,
        keywords: q.keywords,
        source: q.source ?? undefined,
        createdBy: ctx.userId,
        sourceRef: q.sourceRef ?? undefined,
      });
    }

    return questionRepository.createMany(toCreate);
  },

  async updateQuestion(id: string, data: UpdateQuestionInput, ctx: AuthContext): Promise<IQuestion> {
    const existing = await questionRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Question');

    let chapterId: string | undefined;
    let chapterName: string | undefined;
    if (data.chapterName) {
      const chapter = await chapterRepository.findOrCreate(
        ctx.schoolId, data.class ?? existing.class, data.subject ?? existing.subject, data.chapterName, data.topic,
      );
      chapterId = String(chapter._id);
      chapterName = chapter.chapterName;
    }

    const updated = await questionRepository.update(id, ctx.schoolId, {
      ...data,
      options: data.options ?? undefined,
      correctAnswer: data.correctAnswer ?? undefined,
      source: data.source ?? undefined,
      chapterId,
      chapterName,
    });
    if (!updated) throw new NotFoundError('Question');
    return updated;
  },

  /**
   * Previously-uploaded photos/PDFs whose converted text was saved for reuse.
   * class/subject omitted → the "pending uploads" view, listing everything for
   * the school so any teacher can pick up and generate questions from a
   * colleague's upload too.
   */
  async listSources(query: ListSourcesInput, ctx: AuthContext): Promise<IQuestionSource[]> {
    return questionSourceRepository.findAll(ctx.schoolId, query.class, query.subject);
  },

  async getSource(id: string, ctx: AuthContext): Promise<IQuestionSource> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    return source;
  },

  /** Re-runs AI structuring over a saved upload's converted text, without needing the original file again. */
  async reExtractSource(id: string, ctx: AuthContext): Promise<{ jobId: string }> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    return questionExtractionService.enqueueReExtractFromSource(source, ctx);
  },

  /** Sets the chapter this upload belongs to — pre-fills every question drafted from it from then on. */
  async updateSourceChapter(id: string, chapterName: string, ctx: AuthContext): Promise<IQuestionSource> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    const updated = await questionSourceRepository.updateChapterName(id, ctx.schoolId, chapterName);
    if (!updated) throw new NotFoundError('Upload');
    return updated;
  },

  /** PATCH /sources/:id — chapter rename (legacy) and/or structured content edits (teacher review). */
  async updateSource(id: string, data: UpdateSourceInput, ctx: AuthContext): Promise<IQuestionSource> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');

    if (data.pages) {
      const extractedText = flattenBlocksToText(data.pages.flatMap((p) => p.blocks));
      const updated = await questionSourceRepository.updateStructuredContent(id, ctx.schoolId, {
        documentTitle: data.documentTitle ?? source.documentTitle,
        pages: data.pages,
        extractedText: extractedText || source.extractedText,
        reviewStatus: data.reviewStatus,
      });
      if (!updated) throw new NotFoundError('Upload');
      if (data.chapterName) return (await questionSourceRepository.updateChapterName(id, ctx.schoolId, data.chapterName)) ?? updated;
      return updated;
    }

    if (data.chapterName) {
      const updated = await questionSourceRepository.updateChapterName(id, ctx.schoolId, data.chapterName);
      if (!updated) throw new NotFoundError('Upload');
      return updated;
    }

    return source;
  },

  /** POST /extract/chapter — starts a multi-page structured OCR batch job. */
  async enqueueChapterCapture(images: { dataUri: string; fileName?: string }[], ctx: AuthContext): Promise<{ jobId: string }> {
    if (images.length === 0) throw new ValidationError('At least one page image is required');
    return questionExtractionService.enqueueChapterCapture(images, ctx);
  },

  /** POST /extract/jobs/:id/pages/:pageNumber/retry — reprocess a single page without redoing the whole batch. */
  async retryChapterPage(jobId: string, pageNumber: number, imageDataUri: string, ctx: AuthContext) {
    return questionExtractionService.retryPage(jobId, pageNumber, imageDataUri, ctx);
  },

  /** POST /sources — finalizes a reviewed chapter-capture job into a permanent QuestionSource ("Save Chapter"). */
  async saveChapterSource(data: SaveChapterSourceInput, ctx: AuthContext): Promise<IQuestionSource> {
    return questionExtractionService.saveChapterSource(data.class, data.subject, data, ctx);
  },

  async deleteQuestion(id: string, ctx: AuthContext): Promise<void> {
    const existing = await questionRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Question');

    const deleted = await questionRepository.softDelete(id, ctx.schoolId);
    if (!deleted) throw new ValidationError('Could not delete this question');
  },
};
