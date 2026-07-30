import { ExtractionJob, IExtractionJob, ExtractionJobKind } from './extraction-job.model';
import type { QuestionExtractionResult } from './question-extraction.service';

export const extractionJobRepository = {
  async create(data: { schoolId: string; userId: string; kind: ExtractionJobKind }): Promise<IExtractionJob> {
    return ExtractionJob.create({ ...data, status: 'processing' });
  },

  async findById(id: string, schoolId: string): Promise<IExtractionJob | null> {
    return ExtractionJob.findOne({ _id: id, schoolId }).lean<IExtractionJob>();
  },

  async markCompleted(id: string, result: QuestionExtractionResult): Promise<void> {
    await ExtractionJob.updateOne({ _id: id }, { $set: { status: 'completed', result } });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await ExtractionJob.updateOne({ _id: id }, { $set: { status: 'failed', error } });
  },
};
