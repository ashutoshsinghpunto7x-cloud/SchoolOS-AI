import { UsageEvent, IUsageEvent } from './usage-event.model';

type RecordUsageData = Pick<IUsageEvent, 'userId' | 'schoolId' | 'feature' | 'action' | 'status'>
  & Partial<Pick<IUsageEvent, 'documentId' | 'pagesProcessed' | 'wordsGenerated' | 'processingTimeMs'>>;

export interface ChapterCaptureUsageOverview {
  totalUsers: number;
  totalDocuments: number;
  totalPages: number;
  totalWords: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgProcessingTimeMs: number;
  avgWordsPerDocument: number;
}

export interface ChapterCaptureUserUsage {
  userId: string;
  documents: number;
  pages: number;
  wordsGenerated: number;
  processingRequests: number;
}

export interface UsageFilter {
  schoolId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}

export const usageEventRepository = {
  /** Fire-and-forget — never awaited by callers, matches aiUsageRepository.record. */
  record(data: RecordUsageData): void {
    UsageEvent.create(data).catch(() => {
      // Usage logging must never fail silently-loudly — absorb errors here
    });
  },

  async getChapterCaptureOverview(filter: UsageFilter): Promise<ChapterCaptureUsageOverview> {
    const match: Record<string, unknown> = { feature: 'chapter-capture' };
    if (filter.schoolId) match.schoolId = filter.schoolId;
    if (filter.userId) match.userId = filter.userId;
    if (filter.from || filter.to) {
      match.createdAt = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lte: filter.to } : {}),
      };
    }

    const [rows] = await UsageEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalUsers: { $addToSet: '$userId' },
          totalDocuments: {
            $addToSet: {
              $cond: [{ $in: ['$action', ['chapter_saved']] }, '$documentId', '$$REMOVE'],
            },
          },
          totalPages: { $sum: { $ifNull: ['$pagesProcessed', 0] } },
          totalWords: { $sum: { $ifNull: ['$wordsGenerated', 0] } },
          totalRequests: { $sum: 1 },
          successfulRequests: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedRequests: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          processingTimeSum: { $sum: { $ifNull: ['$processingTimeMs', 0] } },
          processingTimeCount: { $sum: { $cond: [{ $ifNull: ['$processingTimeMs', false] }, 1, 0] } },
        },
      },
    ]);

    const totalDocuments = rows ? (rows.totalDocuments as unknown[]).filter(Boolean).length : 0;
    const totalUsers = rows ? (rows.totalUsers as unknown[]).length : 0;
    const totalPages = rows?.totalPages ?? 0;
    const totalWords = rows?.totalWords ?? 0;
    const totalRequests = rows?.totalRequests ?? 0;
    const successfulRequests = rows?.successfulRequests ?? 0;
    const failedRequests = rows?.failedRequests ?? 0;
    const avgProcessingTimeMs = rows?.processingTimeCount ? Math.round(rows.processingTimeSum / rows.processingTimeCount) : 0;
    const avgWordsPerDocument = totalDocuments > 0 ? Math.round(totalWords / totalDocuments) : 0;

    return { totalUsers, totalDocuments, totalPages, totalWords, totalRequests, successfulRequests, failedRequests, avgProcessingTimeMs, avgWordsPerDocument };
  },

  async getChapterCaptureByUser(filter: UsageFilter): Promise<ChapterCaptureUserUsage[]> {
    const match: Record<string, unknown> = { feature: 'chapter-capture' };
    if (filter.schoolId) match.schoolId = filter.schoolId;
    if (filter.userId) match.userId = filter.userId;
    if (filter.from || filter.to) {
      match.createdAt = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lte: filter.to } : {}),
      };
    }

    const rows = await UsageEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          documents: {
            $addToSet: {
              $cond: [{ $eq: ['$action', 'chapter_saved'] }, '$documentId', '$$REMOVE'],
            },
          },
          pages: { $sum: { $ifNull: ['$pagesProcessed', 0] } },
          wordsGenerated: { $sum: { $ifNull: ['$wordsGenerated', 0] } },
          processingRequests: { $sum: { $cond: [{ $eq: ['$action', 'capture_started'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((r) => ({
      userId: r._id,
      documents: (r.documents as unknown[]).filter(Boolean).length,
      pages: r.pages,
      wordsGenerated: r.wordsGenerated,
      processingRequests: r.processingRequests,
    }));
  },
};
