import crypto from 'crypto';
import { performanceTestRepository } from './performance-test.repository';
import { performanceTestRunner } from './performance-test.runner';
import { AppError, NotFoundError } from '../../middlewares/errorHandler';
import type { StartPerformanceTestInput } from './performance-test.validation';

export const performanceTestService = {
  async startTest(input: StartPerformanceTestInput, actor: { userId: string; name: string }) {
    if (performanceTestRunner.isRunning()) {
      throw new AppError('A performance test is already running — stop it before starting another.', 409, 'TEST_ALREADY_RUNNING');
    }

    const runId = crypto.randomUUID();
    const label = input.label || `Teacher Workspace Load Test — ${input.vus} Users`;

    await performanceTestRepository.create({
      runId,
      label,
      scriptName: 'teacher-workspace',
      targetVUs: input.vus,
      durationMinutes: input.durationMinutes,
      status: 'running',
      stage: 'ramp-up',
      startedAt: new Date(),
      startedByUserId: actor.userId,
      startedByName: actor.name,
    });

    performanceTestRunner.start({ runId, label, targetVUs: input.vus, durationMinutes: input.durationMinutes });

    return { runId, label };
  },

  stopTest(runId: string) {
    try {
      performanceTestRunner.stop(runId);
    } catch (err) {
      throw new AppError((err as Error).message, 409, 'TEST_NOT_RUNNING');
    }
    return { runId };
  },

  getLive() {
    return performanceTestRunner.getLiveSnapshot();
  },

  async listRuns(opts: { page: number; limit: number }) {
    return performanceTestRepository.list(opts);
  },

  async getRun(runId: string) {
    const run = await performanceTestRepository.findByRunId(runId);
    if (!run) throw new NotFoundError('Performance test run');
    return run;
  },

  async getRunReportCsv(runId: string): Promise<string> {
    const run = await this.getRun(runId);
    const summary = run.summary ?? {};
    const rows = [['metric', 'value'], ...Object.entries(summary).map(([k, v]) => [k, String(v)])];
    return rows.map((r) => r.join(',')).join('\n');
  },
};
