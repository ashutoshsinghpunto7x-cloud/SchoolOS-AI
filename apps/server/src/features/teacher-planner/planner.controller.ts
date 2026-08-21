import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess, sendCreated } from '../../lib/response';
import { plannerService } from './planner.service';
import { confirmPlannerSchema, updateTaskSchema, plannerTargetSchema, generatePlannerSchema } from './planner.validation';

export const plannerController = {
  /** GET /teacher-planner/chapters?class=8&subject=Science */
  async listChapters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = plannerTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const chapters = await plannerService.listChapters(query, ctx);
      sendSuccess(res, chapters);
    } catch (err) { next(err); }
  },

  /** GET /teacher-planner/teaching-weeks?class=8&subject=Science */
  async getTeachingWeeks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = plannerTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const info = await plannerService.getTeachingWeeksInfo(query, ctx);
      sendSuccess(res, info);
    } catch (err) { next(err); }
  },

  /** POST /teacher-planner/generate — build a draft plan from selected chapters + durations */
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = generatePlannerSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const draft = await plannerService.generateDraft(data, ctx);
      sendSuccess(res, draft, 'Draft plan generated — review before saving');
    } catch (err) { next(err); }
  },

  /** POST /teacher-planner/confirm — save reviewed/edited draft weeks (first save or a later edit) */
  async confirmPlanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = confirmPlannerSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const planner = await plannerService.confirmPlanner(data, ctx);
      sendCreated(res, planner, 'Planner saved');
    } catch (err) { next(err); }
  },

  /** GET /teacher-planner/mine?class=8&subject=Science */
  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = plannerTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const planner = await plannerService.getMine(query, ctx);
      sendSuccess(res, planner);
    } catch (err) { next(err); }
  },

  /** PATCH /teacher-planner/:id/tasks/:taskId — status toggle and/or an
   *  in-place edit of the task's title/due date. */
  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, title, dueDate } = updateTaskSchema.parse({ ...req.body, taskId: req.params.taskId });
      const ctx = buildAuthContext(req.user!);
      const planner = await plannerService.updateTask(req.params.id, req.params.taskId, { status, title, dueDate }, ctx);
      sendSuccess(res, planner, 'Task updated');
    } catch (err) { next(err); }
  },

  /** GET /teacher-planner/:id/progress */
  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const progress = await plannerService.getProgress(req.params.id, ctx);
      sendSuccess(res, progress);
    } catch (err) { next(err); }
  },

  /** GET /teacher-planner/:id/pace */
  async getPace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const pace = await plannerService.getPace(req.params.id, ctx);
      sendSuccess(res, pace);
    } catch (err) { next(err); }
  },

  // ── Principal (read-only) ────────────────────────────────────────────────

  /** GET /teacher-planner/principal/overview */
  async getPrincipalOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const overview = await plannerService.getPrincipalOverview(ctx);
      sendSuccess(res, overview);
    } catch (err) { next(err); }
  },

  /** GET /teacher-planner/principal/:teacherId?class=&subject= */
  async getForTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = plannerTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const result = await plannerService.getForTeacher(req.params.teacherId, query, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
};
