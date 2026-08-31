import { QuestionSource, IQuestionSource, QuestionSourceKind } from './question-source.model';
import type { ChapterPage, PageFigure } from '@schoolos/types';
import { deleteImage } from '../../lib/image-store';

export const questionSourceRepository = {
  async create(data: {
    schoolId: string;
    userId: string;
    class: string;
    subject: string;
    kind: QuestionSourceKind;
    fileName?: string;
    extractedText: string;
    chapterName?: string;
    documentTitle?: string;
    language?: string;
    pages?: ChapterPage[];
    reviewStatus?: 'ready_for_review' | 'saved';
    pageImageFileId?: string;
    figures?: PageFigure[];
  }): Promise<IQuestionSource> {
    return QuestionSource.create(data);
  },

  /** cls/subject omitted → every stored upload for the school (used by the "pending uploads" view, which isn't scoped to one class/subject). */
  async findAll(schoolId: string, cls?: string, subject?: string): Promise<IQuestionSource[]> {
    const filter: Record<string, string> = { schoolId };
    if (cls) filter.class = cls;
    if (subject) filter.subject = subject;
    return QuestionSource.find(filter).sort({ createdAt: -1 }).lean<IQuestionSource[]>();
  },

  async findById(id: string, schoolId: string): Promise<IQuestionSource | null> {
    return QuestionSource.findOne({ _id: id, schoolId }).lean<IQuestionSource>();
  },

  async updateChapterName(id: string, schoolId: string, chapterName: string): Promise<IQuestionSource | null> {
    return QuestionSource.findOneAndUpdate({ _id: id, schoolId }, { chapterName }, { new: true }).lean<IQuestionSource>();
  },

  /** Teacher edits to structured content during review — recomputes extractedText from the edited blocks so it stays in sync. */
  async updateStructuredContent(
    id: string, schoolId: string, data: { documentTitle?: string; pages: ChapterPage[]; extractedText: string; reviewStatus?: 'ready_for_review' | 'saved' },
  ): Promise<IQuestionSource | null> {
    return QuestionSource.findOneAndUpdate({ _id: id, schoolId }, { $set: data }, { new: true }).lean<IQuestionSource>();
  },

  /**
   * Hard delete, unlike questionRepository.softDelete — a source is just converted OCR text
   * (and, for chapter captures, a page/block array that can get sizeable), not a graded/exam
   * record, and the whole point of exposing delete here is to actually reclaim that storage once
   * a teacher has no more use for the upload. Any questions already saved from it keep their own
   * copy of the data (sourceRef just loses its target) — see question-bank.service.deleteSource.
   */
  async delete(id: string, schoolId: string): Promise<boolean> {
    // Clean up any GridFS-stored page images before the source row itself goes — they're not
    // referenced anywhere else once this source is gone, so leaving them behind would just leak
    // storage silently (readImage's schoolId check means an orphaned file could never even be
    // served again, so there's no reason to keep it).
    const source = await QuestionSource.findOne({ _id: id, schoolId }).lean<IQuestionSource>();
    const fileIds = [
      source?.pageImageFileId,
      ...(source?.pages ?? []).map((p) => p.pageImageFileId),
    ].filter((v): v is string => !!v);
    await Promise.all(fileIds.map((fileId) => deleteImage(fileId)));

    const res = await QuestionSource.deleteOne({ _id: id, schoolId });
    return res.deletedCount > 0;
  },
};
