import { AuthContext } from '../../lib/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { timetableRepository } from '../timetable/timetable.repository';
import { classNameKey } from '../../lib/class-name';
import { chapterRepository } from './chapter.repository';
import { questionRepository, QuestionListOptions } from './question.repository';
import { questionSourceRepository } from './question-source.repository';
import { paperRepository } from './paper.repository';
import { questionExtractionService, flattenBlocksToText } from './question-extraction.service';
import { IQuestion } from './question.model';
import { ISyllabusChapter } from './chapter.model';
import { IQuestionSource } from './question-source.model';
import { normalizeOptions } from './option-text';
import type { PrincipalMaterialsClass, PrincipalMaterialsChapter, PrincipalMaterialsPaper } from '@schoolos/types';
import {
  ConfirmExtractedQuestionsInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  ListQuestionsInput,
  ListQuestionGroupsInput,
  ListSourcesInput,
  UpdateSourceInput,
  SaveChapterSourceInput,
  ReExtractSourceInput,
} from './question-bank.validation';

// ── Teacher scope guard ────────────────────────────────────────────────────────
// Question Bank routes are only role-gated (admin/principal/teacher/academic_coordinator),
// not scoped to a teacher's own classes/subjects — any teacher could list/view/generate for ANY
// class/subject school-wide. Same shape/rationale as teacher-planner's assertTeacherCanManagePlanner
// (see that file's comment): Teacher.subjects/assignedClasses aren't reliably kept up to date, so
// the Timetable is the source of truth for "does this teacher teach this class+subject".
export interface AllowedClassSubject { class: string; subject: string }

async function resolveTeacherId(ctx: AuthContext, schoolId: string): Promise<string> {
  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class/subject assignment');

  const teacher = await Teacher.findOne({ schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean() as { _id: { toString(): string } } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  return String(teacher._id);
}

/** Non-teacher roles (admin/principal/academic_coordinator) bypass entirely — the route is
 *  already role-gated to those roles for anything sensitive. */
export async function assertTeacherCanAccessQuestionBank(ctx: AuthContext, schoolId: string, cls: string, subject: string): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const teacherId = await resolveTeacherId(ctx, schoolId);
  const timetables = await timetableRepository.getTeacherSchedule(schoolId, teacherId);
  const teachesThis = timetables.some(
    (tt) => classNameKey(tt.class) === classNameKey(cls) && tt.entries.some((e) => e.teacherId === teacherId && e.subjectName === subject),
  );
  if (!teachesThis) {
    throw new ForbiddenError('You are not assigned to teach this subject/class');
  }
}

/** Every {class, subject} pair (deduped) the teacher currently teaches per timetable — backs the
 *  "browse without a specific class/subject filter" cases, so a teacher's unscoped list/browse
 *  requests only ever see their own classes/subjects instead of the whole school's. Non-teacher
 *  roles get an empty array back (callers should only use this when ctx.role === 'teacher'). */
export async function getTeacherAllowedClassSubjects(ctx: AuthContext, schoolId: string): Promise<AllowedClassSubject[]> {
  if (ctx.role !== 'teacher') return [];

  const teacherId = await resolveTeacherId(ctx, schoolId);
  const timetables = await timetableRepository.getTeacherSchedule(schoolId, teacherId);

  const pairs = new Map<string, AllowedClassSubject>();
  for (const tt of timetables) {
    for (const entry of tt.entries) {
      if (entry.teacherId !== teacherId || !entry.subjectName) continue;
      const key = `${classNameKey(tt.class)}::${entry.subjectName}`;
      if (!pairs.has(key)) pairs.set(key, { class: tt.class, subject: entry.subjectName });
    }
  }
  return [...pairs.values()];
}

// ── Principal materials-by-class overview ──────────────────────────────────────
// Shapes shared with the frontend live in @schoolos/types (PrincipalMaterials*).

function normalizeChapterName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

interface MaterialsBucket {
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  byType: Record<string, number>;
  byDifficulty: Record<string, number>;
  total: number;
  teacherIds: Set<string>;
  lastUpdated: Date | null;
  papers: PrincipalMaterialsPaper[];
}

export const questionBankService = {
  async listChapters(rawQuery: unknown, ctx: AuthContext): Promise<ISyllabusChapter[]> {
    const query = rawQuery as { class: string; subject: string };
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, query.class, query.subject);
    return chapterRepository.findAll(ctx.schoolId, query.class, query.subject);
  },

  async listQuestions(query: ListQuestionsInput, ctx: AuthContext) {
    const opts: QuestionListOptions = { ...query };
    if (query.class && query.subject) {
      await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, query.class, query.subject);
    } else if (ctx.role === 'teacher') {
      const allowed = await getTeacherAllowedClassSubjects(ctx, ctx.schoolId);
      const narrowed = allowed.filter(
        (p) => (!query.class || classNameKey(p.class) === classNameKey(query.class)) && (!query.subject || p.subject === query.subject),
      );
      if (narrowed.length === 0) return { questions: [], total: 0, page: opts.page ?? 1, limit: opts.limit ?? 20 };
      opts.classSubjectPairs = narrowed;
    }
    return questionRepository.findAll(ctx.schoolId, opts);
  },

  /** Chapter-grouped counts backing the Question Bank landing view (one row per class/subject/chapter). */
  async listQuestionGroups(query: ListQuestionGroupsInput, ctx: AuthContext) {
    const opts: ListQuestionGroupsInput & { classSubjectPairs?: AllowedClassSubject[] } = { ...query };
    if (query.class && query.subject) {
      await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, query.class, query.subject);
    } else if (ctx.role === 'teacher') {
      const allowed = await getTeacherAllowedClassSubjects(ctx, ctx.schoolId);
      const narrowed = allowed.filter(
        (p) => (!query.class || classNameKey(p.class) === classNameKey(query.class)) && (!query.subject || p.subject === query.subject),
      );
      if (narrowed.length === 0) return [];
      opts.classSubjectPairs = narrowed;
    }
    return questionRepository.findGroups(ctx.schoolId, opts);
  },

  async getQuestion(id: string, ctx: AuthContext): Promise<IQuestion> {
    const question = await questionRepository.findById(id, ctx.schoolId);
    if (!question) throw new NotFoundError('Question');
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, question.class, question.subject);
    return question;
  },

  async createQuestion(data: CreateQuestionInput, ctx: AuthContext): Promise<IQuestion> {
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, data.class, data.subject);
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
      options: normalizeOptions(data.options),
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
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, data.class, data.subject);
    // Resolved fresh per question (not cached by chapterName) — sequential
    // findOrCreate calls each see the previous iteration's topic additions,
    // so multiple questions sharing a chapter (even under slightly different
    // spellings) all land on one chapter row with a complete topics list.
    //
    // Skipped-duplicate guard: the process-once extraction guard (question-extraction.service's
    // "content hasn't changed" branch) hands back a chapter's already-saved questions as a
    // re-editable draft batch rather than re-running AI — exactly the same shape a fresh
    // extraction returns. Without a check here, every time a teacher reopens "Generate
    // Questions" on an already-processed chapter and hits Save, the whole existing batch gets
    // re-inserted as brand-new documents, silently doubling the bank on each click. Existing
    // texts are looked up once per chapter (not per question) as each new chapterId is seen.
    const existingTextsByChapter = new Map<string, Set<string>>();
    const toCreate = [];
    for (const q of data.questions) {
      const topic = q.topic ?? undefined;
      const chapter = await chapterRepository.findOrCreate(ctx.schoolId, data.class, data.subject, q.chapterName, topic);
      const chapterId = String(chapter._id);

      if (!existingTextsByChapter.has(chapterId)) {
        const textsInThisBatch = data.questions.filter((dq) => dq.chapterName === q.chapterName).map((dq) => dq.questionText);
        existingTextsByChapter.set(chapterId, await questionRepository.findExistingTexts(ctx.schoolId, chapterId, textsInThisBatch));
      }
      if (existingTextsByChapter.get(chapterId)!.has(q.questionText.trim().toLowerCase())) continue;

      toCreate.push({
        schoolId: ctx.schoolId,
        class: data.class,
        subject: data.subject,
        chapterId,
        chapterName: chapter.chapterName,
        topic,
        topicId: q.topicId ?? undefined,
        subtopicId: q.subtopicId ?? undefined,
        questionText: q.questionText,
        questionType: q.questionType,
        options: normalizeOptions(q.options),
        correctAnswer: q.correctAnswer ?? undefined,
        difficulty: q.difficulty,
        marks: q.marks,
        estimatedTimeMinutes: q.estimatedTimeMinutes,
        bloomsLevel: q.bloomsLevel,
        keywords: q.keywords,
        source: q.source ?? undefined,
        createdBy: ctx.userId,
        sourceRef: q.sourceRef ?? undefined,
        imageRef: q.imageRef ?? undefined,
        imageRequirement: q.imageRequirement ?? undefined,
      });
    }

    return questionRepository.createMany(toCreate);
  },

  async updateQuestion(id: string, data: UpdateQuestionInput, ctx: AuthContext): Promise<IQuestion> {
    const existing = await questionRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Question');
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, existing.class, existing.subject);
    if (data.class && data.subject && (data.class !== existing.class || data.subject !== existing.subject)) {
      await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, data.class, data.subject);
    }

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
      options: normalizeOptions(data.options),
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
    if (query.class && query.subject) {
      await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, query.class, query.subject);
      return questionSourceRepository.findAll(ctx.schoolId, query.class, query.subject);
    }

    const sources = await questionSourceRepository.findAll(ctx.schoolId, query.class, query.subject);
    if (ctx.role !== 'teacher') return sources;

    const allowed = await getTeacherAllowedClassSubjects(ctx, ctx.schoolId);
    const allowedKeys = new Set(allowed.map((p) => `${classNameKey(p.class)}::${p.subject}`));
    return sources.filter((s) => allowedKeys.has(`${classNameKey(s.class)}::${s.subject}`));
  },

  async getSource(id: string, ctx: AuthContext): Promise<IQuestionSource> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, source.class, source.subject);
    return source;
  },

  /** Re-runs AI structuring over a saved upload's converted text, without needing the original file again. */
  async reExtractSource(id: string, options: ReExtractSourceInput, ctx: AuthContext): Promise<{ jobId: string }> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, source.class, source.subject);
    return questionExtractionService.enqueueReExtractFromSource(source, options, ctx);
  },

  /** Sets the chapter this upload belongs to — pre-fills every question drafted from it from then on, and registers the chapter in the syllabus chapter bank (so it shows up for Planner too) rather than waiting on question generation. */
  async updateSourceChapter(id: string, chapterName: string, ctx: AuthContext): Promise<IQuestionSource> {
    const source = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!source) throw new NotFoundError('Upload');
    const updated = await questionSourceRepository.updateChapterName(id, ctx.schoolId, chapterName);
    if (!updated) throw new NotFoundError('Upload');
    await chapterRepository.findOrCreate(ctx.schoolId, source.class, source.subject, chapterName);
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
      if (data.chapterName) {
        await chapterRepository.findOrCreate(ctx.schoolId, source.class, source.subject, data.chapterName);
        return (await questionSourceRepository.updateChapterName(id, ctx.schoolId, data.chapterName)) ?? updated;
      }
      return updated;
    }

    if (data.chapterName) {
      const updated = await questionSourceRepository.updateChapterName(id, ctx.schoolId, data.chapterName);
      if (!updated) throw new NotFoundError('Upload');
      await chapterRepository.findOrCreate(ctx.schoolId, source.class, source.subject, data.chapterName);
      return updated;
    }

    return source;
  },

  /** POST /extract/chapter — starts a multi-page batch job that reads each page straight into question drafts. */
  async enqueueChapterCapture(
    cls: string, subject: string, chapterName: string | undefined,
    images: { dataUri: string; fileName?: string }[], ctx: AuthContext, detectImages = false,
  ): Promise<{ jobId: string }> {
    if (images.length === 0) throw new ValidationError('At least one page image is required');
    return questionExtractionService.enqueueChapterCapture(cls, subject, chapterName, images, ctx, detectImages);
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
    await assertTeacherCanAccessQuestionBank(ctx, ctx.schoolId, existing.class, existing.subject);

    const deleted = await questionRepository.softDelete(id, ctx.schoolId);
    if (!deleted) throw new ValidationError('Could not delete this question');
  },

  /** DELETE /questions/groups — removes every question in one or more chapter groups (the landing view's per-row delete and the collective/bulk delete both go through this). */
  async deleteQuestionGroups(groups: { class: string; subject: string; chapterId: string }[], ctx: AuthContext): Promise<number> {
    return questionRepository.softDeleteByChapterGroups(ctx.schoolId, groups);
  },

  /** POST /questions/groups/merge — combines 2+ landing-view chapter groups (typically ones the AI mistakenly split apart) into one target chapter. All selected groups must share one class/subject. */
  async mergeQuestionGroups(
    groups: { class: string; subject: string; chapterId: string; chapterName: string }[],
    targetChapterName: string,
    ctx: AuthContext,
  ): Promise<number> {
    const [first, ...rest] = groups;
    if (rest.some((g) => g.class !== first.class || g.subject !== first.subject)) {
      throw new ValidationError('Only chapters from the same class and subject can be merged');
    }
    const chapter = await chapterRepository.findOrCreate(ctx.schoolId, first.class, first.subject, targetChapterName);
    return questionRepository.mergeChapterGroups(ctx.schoolId, groups, { chapterId: String(chapter._id), chapterName: chapter.chapterName });
  },

  /**
   * DELETE /sources/:id — permanently removes an upload's converted text (and, for chapter
   * captures, its page/block content). This is a hard delete, not a soft one: unlike a question,
   * a source has no exam/grading history depending on it, and the point of exposing this is to
   * free up storage from uploads a teacher no longer needs. Any questions already saved from this
   * source keep their own copy of every field — deleting the source only drops the "Show source"
   * traceability link (sourceRef), never the saved questions themselves.
   */
  async deleteSource(id: string, ctx: AuthContext): Promise<void> {
    const existing = await questionSourceRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Upload');

    const deleted = await questionSourceRepository.delete(id, ctx.schoolId);
    if (!deleted) throw new ValidationError('Could not delete this upload');
  },

  /**
   * GET /question-bank/principal/overview — every class → subject → chapter in the school, with
   * question counts (by type/difficulty), generated papers, last-updated timestamp, and the
   * teacher(s) who authored/uploaded each chapter's material. Route is already role-gated to
   * admin/principal/academic_coordinator; no per-class/subject guard needed (that's the whole
   * point of this screen — seeing everything at once).
   *
   * Every chapter row is seeded up front (from the syllabus chapter bank) so a chapter with only
   * an upload and no questions generated yet still shows up. A source's chapterName is matched
   * back to a chapter by normalized name (sources don't carry a chapterId); one that doesn't
   * match any known chapter gets its own synthetic bucket rather than being silently dropped.
   */
  async getPrincipalOverview(ctx: AuthContext): Promise<PrincipalMaterialsClass[]> {
    const [chapters, questions, sources, papers] = await Promise.all([
      chapterRepository.findAllForSchool(ctx.schoolId),
      questionRepository.findAllForSchool(ctx.schoolId),
      questionSourceRepository.findAllForSchool(ctx.schoolId),
      paperRepository.findAllForSchool(ctx.schoolId),
    ]);

    const buckets = new Map<string, MaterialsBucket>();
    const bucketFor = (cls: string, subject: string, chapterId: string, chapterName: string): MaterialsBucket => {
      const key = `${classNameKey(cls)}::${subject}::${chapterId}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          class: cls, subject, chapterId, chapterName,
          byType: {}, byDifficulty: {}, total: 0,
          teacherIds: new Set(), lastUpdated: null, papers: [],
        };
        buckets.set(key, bucket);
      }
      return bucket;
    };
    const touch = (bucket: MaterialsBucket, at: Date) => {
      if (!bucket.lastUpdated || at > bucket.lastUpdated) bucket.lastUpdated = at;
    };

    // Seed every known chapter first so one with only an upload (no questions yet) still appears.
    for (const c of chapters) bucketFor(c.class, c.subject, String(c._id), c.chapterName);

    const chapterByNormalizedName = new Map<string, ISyllabusChapter>();
    for (const c of chapters) {
      chapterByNormalizedName.set(`${classNameKey(c.class)}::${c.subject}::${normalizeChapterName(c.chapterName)}`, c);
    }

    for (const q of questions) {
      const bucket = bucketFor(q.class, q.subject, q.chapterId, q.chapterName);
      bucket.total += 1;
      bucket.byType[q.questionType] = (bucket.byType[q.questionType] ?? 0) + 1;
      bucket.byDifficulty[q.difficulty] = (bucket.byDifficulty[q.difficulty] ?? 0) + 1;
      bucket.teacherIds.add(q.createdBy);
      touch(bucket, q.createdAt);
    }

    for (const s of sources) {
      if (!s.chapterName) continue;
      const match = chapterByNormalizedName.get(`${classNameKey(s.class)}::${s.subject}::${normalizeChapterName(s.chapterName)}`);
      const chapterId = match ? String(match._id) : `unlinked:${normalizeChapterName(s.chapterName)}`;
      const bucket = bucketFor(s.class, s.subject, chapterId, s.chapterName);
      bucket.teacherIds.add(s.userId);
      touch(bucket, s.updatedAt);
    }

    for (const p of papers) {
      const chapterIds = p.config.chapterIds ?? [];
      for (const chapterId of chapterIds) {
        const chapter = chapters.find((c) => String(c._id) === chapterId);
        if (!chapter) continue; // paper references a chapter that's since been deleted
        const bucket = bucketFor(p.config.class, p.config.subject, chapterId, chapter.chapterName);
        bucket.papers.push({ _id: String(p._id), title: p.config.examType, createdAt: p.createdAt.toISOString() });
        bucket.teacherIds.add(p.createdBy);
        touch(bucket, p.createdAt);
      }
    }

    const allTeacherIds = [...new Set([...buckets.values()].flatMap((b) => [...b.teacherIds]))];
    const users = allTeacherIds.length > 0
      ? await User.find({ _id: { $in: allTeacherIds } }).select('firstName lastName').lean() as { _id: unknown; firstName: string; lastName: string }[]
      : [];
    const nameById = new Map(users.map((u) => [String(u._id), `${u.firstName} ${u.lastName}`.trim()]));

    const classMap = new Map<string, Map<string, PrincipalMaterialsChapter[]>>();
    for (const bucket of buckets.values()) {
      if (!classMap.has(bucket.class)) classMap.set(bucket.class, new Map());
      const subjectMap = classMap.get(bucket.class)!;
      if (!subjectMap.has(bucket.subject)) subjectMap.set(bucket.subject, []);
      subjectMap.get(bucket.subject)!.push({
        chapterId: bucket.chapterId,
        chapterName: bucket.chapterName,
        questionCount: bucket.total,
        questionCountByType: bucket.byType,
        questionCountByDifficulty: bucket.byDifficulty,
        papers: bucket.papers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        lastUpdated: bucket.lastUpdated ? bucket.lastUpdated.toISOString() : null,
        teacherNames: [...bucket.teacherIds].map((id) => nameById.get(id) ?? 'Unknown').sort(),
      });
    }

    return [...classMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([cls, subjectMap]) => ({
        class: cls,
        subjects: [...subjectMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subject, chaps]) => ({
            subject,
            chapters: chaps.sort((a, b) => a.chapterName.localeCompare(b.chapterName)),
          })),
      }));
  },
};
