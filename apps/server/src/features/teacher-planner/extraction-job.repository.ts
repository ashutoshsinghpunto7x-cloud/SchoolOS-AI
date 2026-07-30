import { PlannerExtractionJob, IPlannerExtractionJob, PlannerExtractionJobKind } from './extraction-job.model';
import type { PlannerExtractionResult } from './planner-extraction.service';

export const plannerExtractionJobRepository = {
  async create(data: { schoolId: string; userId: string; kind: PlannerExtractionJobKind }): Promise<IPlannerExtractionJob> {
    return PlannerExtractionJob.create({ ...data, status: 'processing' });
  },

  async findById(id: string, schoolId: string): Promise<IPlannerExtractionJob | null> {
    return PlannerExtractionJob.findOne({ _id: id, schoolId }).lean<IPlannerExtractionJob>();
  },

  async markCompleted(id: string, result: PlannerExtractionResult): Promise<void> {
    await PlannerExtractionJob.updateOne({ _id: id }, { $set: { status: 'completed', result } });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await PlannerExtractionJob.updateOne({ _id: id }, { $set: { status: 'failed', error } });
  },
};
