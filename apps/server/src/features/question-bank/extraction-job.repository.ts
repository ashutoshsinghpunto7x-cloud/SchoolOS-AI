import { ExtractionJob, IExtractionJob, ExtractionJobKind } from './extraction-job.model';
import type { QuestionExtractionResult, TextExtractionResult } from './question-extraction.service';
import type { ChapterCaptureJobResult } from '@schoolos/types';

type JobResult = QuestionExtractionResult | TextExtractionResult | ChapterCaptureJobResult;

export const extractionJobRepository = {
  async create(data: { schoolId: string; userId: string; kind: ExtractionJobKind; totalPages?: number; class?: string; subject?: string; chapterName?: string }): Promise<IExtractionJob> {
    return ExtractionJob.create({ ...data, status: 'processing', completedPages: 0 });
  },

  async findById(id: string, schoolId: string): Promise<IExtractionJob | null> {
    return ExtractionJob.findOne({ _id: id, schoolId }).lean<IExtractionJob>();
  },

  async markCompleted(id: string, result: JobResult): Promise<void> {
    await ExtractionJob.updateOne({ _id: id }, { $set: { status: 'completed', result } });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await ExtractionJob.updateOne({ _id: id }, { $set: { status: 'failed', error } });
  },

  /** Bumps progress and (optionally) writes the in-progress partial result — used mid-batch by chapter-capture so the client can render a progress bar without waiting for the whole job to finish. */
  async updateProgress(id: string, completedPages: number, partialResult?: JobResult): Promise<void> {
    const update: Record<string, unknown> = { completedPages };
    if (partialResult) update.result = partialResult;
    await ExtractionJob.updateOne({ _id: id }, { $set: update });
  },
};
