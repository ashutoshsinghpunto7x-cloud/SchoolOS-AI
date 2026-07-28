import { AiExtractionJob, IAiExtractionJob, AiExtractionJobKind } from './ai-extraction-job.model';
import type { MarksExtractionResult } from './marks-extraction.service';

export const aiExtractionJobRepository = {
  async create(data: { schoolId: string; userId: string; kind: AiExtractionJobKind }): Promise<IAiExtractionJob> {
    return AiExtractionJob.create({ ...data, status: 'processing' });
  },

  async findById(id: string, schoolId: string): Promise<IAiExtractionJob | null> {
    return AiExtractionJob.findOne({ _id: id, schoolId }).lean<IAiExtractionJob>();
  },

  async markCompleted(id: string, result: MarksExtractionResult): Promise<void> {
    await AiExtractionJob.updateOne({ _id: id }, { $set: { status: 'completed', result } });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await AiExtractionJob.updateOne({ _id: id }, { $set: { status: 'failed', error } });
  },
};
