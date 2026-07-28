import { Request, Response, NextFunction } from 'express';
import { performanceTestService } from './performance-test.service';
import { sendSuccess, sendPaginated } from '../../lib/response';
import { startPerformanceTestSchema, performanceTestListQuerySchema } from './performance-test.validation';

export const performanceTestController = {
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = startPerformanceTestSchema.parse(req.body);
      const { userId, firstName, lastName } = req.user!;
      const result = await performanceTestService.startTest(input, { userId, name: `${firstName} ${lastName}` });
      sendSuccess(res, result, 'Test started', 201);
    } catch (err) { next(err); }
  },

  async stop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = performanceTestService.stopTest(req.params.runId);
      sendSuccess(res, result, 'Test stopped');
    } catch (err) { next(err); }
  },

  async live(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const snapshot = performanceTestService.getLive();
      sendSuccess(res, snapshot);
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = performanceTestListQuerySchema.parse(req.query);
      const result = await performanceTestService.listRuns({ page, limit });
      sendPaginated(res, result.runs, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const run = await performanceTestService.getRun(req.params.runId);
      sendSuccess(res, run);
    } catch (err) { next(err); }
  },

  async reportJson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const run = await performanceTestService.getRun(req.params.runId);
      res.setHeader('Content-Disposition', `attachment; filename="performance-test-${req.params.runId}.json"`);
      res.status(200).json(run);
    } catch (err) { next(err); }
  },

  async reportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csv = await performanceTestService.getRunReportCsv(req.params.runId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="performance-test-${req.params.runId}.csv"`);
      res.status(200).send(csv);
    } catch (err) { next(err); }
  },
};
