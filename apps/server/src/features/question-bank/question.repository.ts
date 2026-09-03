import { Question, IQuestion, QuestionType, QuestionDifficulty, BloomsLevel, IQuestionSourceRef, IQuestionImageRef, IQuestionImageRequirement } from './question.model';
import { classNameKey } from '../../lib/class-name';

export interface QuestionListOptions {
  page?: number;
  limit?: number;
  class?: string;
  subject?: string;
  chapterId?: string;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  search?: string;
}

export interface PaginatedQuestions {
  questions: IQuestion[];
  total: number;
  page: number;
  limit: number;
}

export interface QuestionGroup {
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  count: number;
}

export interface CreateQuestionData {
  schoolId: string;
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  topic?: string;
  topicId?: string;
  subtopicId?: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  estimatedTimeMinutes: number;
  bloomsLevel: BloomsLevel;
  keywords: string[];
  source?: string;
  createdBy: string;
  sourceRef?: IQuestionSourceRef;
  imageRef?: IQuestionImageRef;
  imageRequirement?: IQuestionImageRequirement;
}

// `class` is normalized to classNameKey (Roman numeral -> digit) on every write and read below —
// the same tolerance chapter.repository.ts already applies to SyllabusChapter. Without it, a
// question saved as class "II" and one saved as class "2" for the exact same chapter/grade are
// invisible to each other: they group into two separate landing-page rows for one chapter, a
// class-scoped paper/worksheet generation pool silently only sees half the bank, and
// softDeleteByChapterGroups/deleteQuestionGroups only clears the half matching whichever raw
// spelling the UI happened to pass. See the backfill script for reconciling pre-existing data.
export const questionRepository = {
  async create(data: CreateQuestionData): Promise<IQuestion> {
    return Question.create({ ...data, class: classNameKey(data.class) });
  },

  async createMany(data: CreateQuestionData[]): Promise<IQuestion[]> {
    if (data.length === 0) return [];
    return Question.insertMany(data.map((d) => ({ ...d, class: classNameKey(d.class) })));
  },

  async findAll(schoolId: string, opts: QuestionListOptions = {}): Promise<PaginatedQuestions> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.class) query.class = classNameKey(opts.class);
    if (opts.subject) query.subject = opts.subject;
    if (opts.chapterId) query.chapterId = opts.chapterId;
    if (opts.topic) query.topic = opts.topic;
    if (opts.difficulty) query.difficulty = opts.difficulty;
    if (opts.questionType) query.questionType = opts.questionType;
    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ questionText: regex }, { keywords: regex }, { topic: regex }];
    }

    const [questions, total] = await Promise.all([
      Question.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IQuestion[]>(),
      Question.countDocuments(query),
    ]);

    return { questions, total, page, limit };
  },

  /** Chapter-grouped counts for the Question Bank landing view, optionally narrowed by class/subject/search. */
  async findGroups(schoolId: string, opts: Pick<QuestionListOptions, 'class' | 'subject' | 'search'> = {}): Promise<QuestionGroup[]> {
    const match: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.class) match.class = classNameKey(opts.class);
    if (opts.subject) match.subject = opts.subject;
    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ questionText: regex }, { keywords: regex }, { topic: regex }];
    }

    const rows = await Question.aggregate<{
      _id: { class: string; subject: string; chapterId: string; chapterName: string };
      count: number;
    }>([
      { $match: match },
      { $group: { _id: { class: '$class', subject: '$subject', chapterId: '$chapterId', chapterName: '$chapterName' }, count: { $sum: 1 } } },
      { $sort: { '_id.class': 1, '_id.subject': 1, '_id.chapterName': 1 } },
    ]);

    return rows.map((r) => ({
      class: r._id.class,
      subject: r._id.subject,
      chapterId: r._id.chapterId,
      chapterName: r._id.chapterName,
      count: r.count,
    }));
  },

  async findById(id: string, schoolId: string): Promise<IQuestion | null> {
    return Question.findOne({ _id: id, schoolId, isDeleted: false }).lean<IQuestion>();
  },

  async findByIds(schoolId: string, ids: string[]): Promise<IQuestion[]> {
    if (ids.length === 0) return [];
    return Question.find({ _id: { $in: ids }, schoolId }).lean<IQuestion[]>();
  },

  /** Eligible pool for the paper/worksheet generators: not deleted, matching class/subject/chapters,
   *  optionally narrowed further to specific topics/subtopics within those chapters.
   *
   *  The `topicIds` filter is a deliberate "never let a scoping filter starve a real request"
   *  safeguard: it's applied first, but if that comes back empty AND the matched chapters' pool
   *  has no `topicId`-tagged question at all (i.e. these are legacy/pre-topicTree chapters that
   *  were never going to satisfy a topicId filter in the first place), this falls back to the
   *  unfiltered chapter-level pool instead of returning nothing. A chapter that *does* have
   *  topic-tagged questions but genuinely none matching the requested topicIds still gets an
   *  empty result, as expected. */
  async findEligible(schoolId: string, cls: string, subject: string, chapterIds: string[], topicIds?: string[]): Promise<IQuestion[]> {
    const baseQuery: Record<string, unknown> = {
      schoolId, class: classNameKey(cls), subject, isDeleted: false,
      ...(chapterIds.length > 0 ? { chapterId: { $in: chapterIds } } : {}),
    };

    if (!topicIds || topicIds.length === 0) {
      return Question.find(baseQuery).lean<IQuestion[]>();
    }

    const scoped = await Question.find({ ...baseQuery, topicId: { $in: topicIds } }).lean<IQuestion[]>();
    if (scoped.length > 0) return scoped;

    const anyTopicTagged = await Question.exists({ ...baseQuery, topicId: { $exists: true, $ne: null } });
    if (anyTopicTagged) return scoped; // real pool exists but genuinely doesn't match these topics

    return Question.find(baseQuery).lean<IQuestion[]>(); // legacy pool — never starve on a filter it can't satisfy
  },

  /** Existing (non-deleted) question texts already saved for a chapter — used by confirmExtractedQuestions
   *  to skip re-inserting duplicates when a teacher re-confirms a draft batch the process-once guard handed
   *  back verbatim (e.g. re-opening "Generate Questions" on an already-processed chapter). Trimmed,
   *  case-insensitive exact match — good enough to catch the "identical text confirmed twice" case this
   *  guards against, without the false positives a fuzzy match would risk. */
  async findExistingTexts(schoolId: string, chapterId: string, texts: string[]): Promise<Set<string>> {
    if (texts.length === 0) return new Set();
    const normalized = texts.map((t) => t.trim().toLowerCase());
    const existing = await Question.find({
      schoolId, chapterId, isDeleted: false,
      questionText: { $in: normalized.map((t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
    }).select('questionText').lean<{ questionText: string }[]>();
    return new Set(existing.map((q) => q.questionText.trim().toLowerCase()));
  },

  async update(id: string, schoolId: string, data: Partial<CreateQuestionData>): Promise<IQuestion | null> {
    const normalized = data.class !== undefined ? { ...data, class: classNameKey(data.class) } : data;
    return Question.findOneAndUpdate({ _id: id, schoolId, isDeleted: false }, { $set: normalized }, { new: true }).lean<IQuestion>();
  },

  async softDelete(id: string, schoolId: string): Promise<boolean> {
    const res = await Question.updateOne({ _id: id, schoolId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } });
    return res.modifiedCount > 0;
  },

  /** Soft-deletes every question in one or more chapter groups at once — backs both the single "delete chapter" row action and the collective/bulk delete on the Question Bank landing view. */
  async softDeleteByChapterGroups(schoolId: string, groups: { class: string; subject: string; chapterId: string }[]): Promise<number> {
    if (groups.length === 0) return 0;
    const res = await Question.updateMany(
      { schoolId, isDeleted: false, $or: groups.map((g) => ({ class: classNameKey(g.class), subject: g.subject, chapterId: g.chapterId })) },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    return res.modifiedCount;
  },

  async recordUsage(ids: string[], examId: string | undefined, usedAt: Date): Promise<void> {
    if (ids.length === 0) return;
    await Question.updateMany({ _id: { $in: ids } }, { $push: { usageHistory: { examId, usedAt } } });
  },
};
