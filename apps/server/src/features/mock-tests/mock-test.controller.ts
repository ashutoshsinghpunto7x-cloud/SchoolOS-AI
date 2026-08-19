import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess, sendCreated } from '../../lib/response';
import { mockTestService } from './mock-test.service';
import {
  generateMockTestSchema,
  createMockTestSchema,
  updateMockTestSchema,
  listMockTestsSchema,
  rejectMockTestSchema,
  submitMockTestSchema,
  parentTestsQuerySchema,
  opsChaptersQuerySchema,
} from './mock-test.validation';

export const mockTestController = {
  // ── Ops authoring ────────────────────────────────────────────────────────

  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = generateMockTestSchema.parse(req.body);
      const result = await mockTestService.generate(data);
      sendSuccess(res, result, 'MCQ questions generated');
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createMockTestSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const test = await mockTestService.create(data, ctx);
      sendCreated(res, test, 'Mock test saved as draft');
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateMockTestSchema.parse(req.body);
      const test = await mockTestService.update(req.params.id, data);
      sendSuccess(res, test, 'Mock test updated');
    } catch (err) { next(err); }
  },

  async submitForApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const test = await mockTestService.submitForApproval(req.params.id);
      sendSuccess(res, test, 'Submitted for principal approval');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listMockTestsSchema.parse(req.query);
      const tests = await mockTestService.listForOps(query);
      sendSuccess(res, tests);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const test = await mockTestService.getById(req.params.id);
      sendSuccess(res, test);
    } catch (err) { next(err); }
  },

  async leaderboardOps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entries = await mockTestService.leaderboardOps(req.params.id);
      sendSuccess(res, entries);
    } catch (err) { next(err); }
  },

  async listChaptersForSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = opsChaptersQuerySchema.parse(req.query);
      const chapters = await mockTestService.listChaptersForSchool(query.schoolId, query.class, query.subject);
      sendSuccess(res, chapters);
    } catch (err) { next(err); }
  },

  // ── Principal approval ───────────────────────────────────────────────────

  async listPendingApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const tests = await mockTestService.listPendingApprovals(ctx);
      sendSuccess(res, tests);
    } catch (err) { next(err); }
  },

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const test = await mockTestService.approve(req.params.id, ctx);
      sendSuccess(res, test, 'Mock test approved — it will go live at its scheduled start time');
    } catch (err) { next(err); }
  },

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = rejectMockTestSchema.parse(req.body ?? {});
      const ctx = buildAuthContext(req.user!);
      const test = await mockTestService.reject(req.params.id, data.reason, ctx);
      sendSuccess(res, test, 'Mock test rejected');
    } catch (err) { next(err); }
  },

  // ── Parent / student ─────────────────────────────────────────────────────

  async listForParent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = parentTestsQuerySchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const tests = await mockTestService.listForParent(ctx, query.childId);
      sendSuccess(res, tests);
    } catch (err) { next(err); }
  },

  async getForTaking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = parentTestsQuerySchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const result = await mockTestService.getForTaking(req.params.id, ctx, query.childId);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = submitMockTestSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const result = await mockTestService.submit(req.params.id, data, ctx);
      sendSuccess(res, result, 'Test submitted');
    } catch (err) { next(err); }
  },

  async leaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const entries = await mockTestService.leaderboard(req.params.id, ctx);
      sendSuccess(res, entries);
    } catch (err) { next(err); }
  },
};
