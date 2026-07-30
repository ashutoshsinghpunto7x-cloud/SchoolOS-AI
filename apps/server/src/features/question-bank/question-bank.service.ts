import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { chapterRepository } from './chapter.repository';
import { questionRepository, QuestionListOptions } from './question.repository';
import { questionSourceRepository } from './question-source.repository';
import { questionExtractionService } from './question-extraction.service';
import { IQuestion } from './question.model';
import { ISyllabusChapter } from './chapter.model';
import { IQuestionSource } from './question-source.model';
import {
  ConfirmExtractedQuestionsInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  ListQuestionsInput,
} from './question-bank.validation';

// ── Teacher scope guard ────────────────────────────────────────────────────────
// A teacher may only curate the question bank for a class+subject they're
// actually assigned to teach. Unlike marks (which checks the timetable, the
// source of truth for a specific period), a question bank isn't tied to a
// section/period — so Teacher.subjects/assignedClasses (the coarser
// "what do you teach" fields) is the right check here. Admin/principal bypass.
async function assertTeacherCanManageQuestionBank(ctx: AuthContext, cls: string, subject: string): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class/subject assignment');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('subjects assignedClasses')
    .lean() as { subjects: string[]; assignedClasses: string[] } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  const teachesSubject = teacher.subjects.includes(subject);
  // assignedClasses stores section-qualified values (e.g. '10A'); a class-only
  // check ('10') should match any section of that class.
  const teachesClass = teacher.assignedClasses.some((c) => c === cls || c.startsWith(cls));
  if (!teachesSubject || !teachesClass) {
    throw new ForbiddenError('You are not assigned to teach this subject/class');
  }
}

export const questionBankService = {
  async listChapters(rawQuery: unknown, ctx: AuthContext): Promise<ISyllabusChapter[]> {
    const query = rawQuery as { class: string; subject: string };
    await assertTeacherCanManageQuestionBank(ctx, query.class, query.subject);
    return chapterRepository.findAll(ctx.schoolId, query.class, query.subject);
  },

  async listQuestions(query: ListQuestionsInput, ctx: AuthContext) {
    if (query.class && query.subject) {
      await assertTeacherCanManageQuestionBank(ctx, query.class, query.subject);
    }
    const opts: QuestionListOptions = query;
    return questionRepository.findAll(ctx.schoolId, opts);
  },

  async getQuestion(id: string, ctx: AuthContext): Promise<IQuestion> {
    const question = await questionRepository.findById(id, ctx.schoolId);
    if (!question) throw new NotFoundError('Question');
    return question;
  },

  async createQuestion(data: CreateQuestionInput, ctx: AuthContext): Promise<IQuestion> {
    await assertTeacherCanManageQuestionBank(ctx, data.class, data.subject);
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
    await assertTeacherCanManageQuestionBank(ctx, data.class, data.subject);

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
      });
    }

    return questionRepository.createMany(toCreate);
  },

  async updateQuestion(id: string, data: UpdateQuestionInput, ctx: AuthContext): Promise<IQuestion> {
    const existing = await questionRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Question');
    await assertTeacherCanManageQuestionBank(ctx, data.class ?? existing.class, data.subject ?? existing.subject);

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

  /** Previously-uploaded photos/PDFs whose converted text was saved for reuse. */
  async listSources(rawQuery: unknown, ctx: AuthContext): Promise<IQuestionSource[]> {
    const query = rawQuery as { class: string; subject: string };
    await assertTeacherCanManageQuestionBank(ctx, query.class, query.subject);
    return questionSourceRepository.findAll(ctx.schoolId, query.class, query.subject);
  },

  async getSource(id: string, ctx: AuthContext): Promise<IQuestionSource> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    await assertTeacherCanManageQuestionBank(ctx, source.class, source.subject);
    return source;
  },

  /** Re-runs AI structuring over a saved upload's converted text, without needing the original file again. */
  async reExtractSource(id: string, ctx: AuthContext): Promise<{ jobId: string }> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    await assertTeacherCanManageQuestionBank(ctx, source.class, source.subject);
    return questionExtractionService.enqueueReExtractFromSource(source, ctx);
  },

  async deleteQuestion(id: string, ctx: AuthContext): Promise<void> {
    const existing = await questionRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Question');
    await assertTeacherCanManageQuestionBank(ctx, existing.class, existing.subject);

    const deleted = await questionRepository.softDelete(id, ctx.schoolId);
    if (!deleted) throw new ValidationError('Could not delete this question');
  },
};
