import { PerformanceTestRun, IPerformanceTestRun } from './performance-test.model';

export const performanceTestRepository = {
  async create(doc: Partial<IPerformanceTestRun>) {
    return PerformanceTestRun.create(doc);
  },

  async updateByRunId(runId: string, update: Partial<IPerformanceTestRun>) {
    return PerformanceTestRun.findOneAndUpdate({ runId }, { $set: update }, { new: true }).lean();
  },

  async findByRunId(runId: string) {
    return PerformanceTestRun.findOne({ runId }).lean();
  },

  async list({ page, limit }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const [runs, total] = await Promise.all([
      PerformanceTestRun.find().sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
      PerformanceTestRun.countDocuments(),
    ]);
    return { runs, total, page, limit };
  },
};
