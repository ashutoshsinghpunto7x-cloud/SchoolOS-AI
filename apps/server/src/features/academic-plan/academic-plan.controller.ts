import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess, sendCreated } from '../../lib/response';
import { academicPlanService } from './academic-plan.service';
import { planTargetSchema, generatePlanSchema, setDayStatusSchema, editDaySchema, moveDaySchema } from './academic-plan.validation';
import { z } from 'zod';

const chapterSizingSchema = z.object({
  estimatedPeriods: z.number().min(1).optional(),
  difficulty:       z.enum(['easy', 'moderate', 'hard']).optional(),
  priority:         z.enum(['core', 'important', 'supplementary']).optional(),
  revisionWeight:   z.number().min(1).max(5).optional(),
});

export const academicPlanController = {
  /** POST /academic-plan/generate */
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = generatePlanSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const result = await academicPlanService.generate(data, ctx);
      sendCreated(res, result, 'Academic plan generated');
    } catch (err) { next(err); }
  },

  /** GET /academic-plan/mine?class=&section=&subject= */
  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = planTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const plan = await academicPlanService.getMine(query, ctx);
      sendSuccess(res, plan);
    } catch (err) { next(err); }
  },

  /** PATCH /academic-plan/:id/days */
  async setDayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = setDayStatusSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const plan = await academicPlanService.setDayStatus(req.params.id, data, ctx);
      sendSuccess(res, plan, 'Day updated');
    } catch (err) { next(err); }
  },

  /** PATCH /academic-plan/:id/days/edit */
  async editDay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = editDaySchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const plan = await academicPlanService.editDay(req.params.id, data, ctx);
      sendSuccess(res, plan, 'Day edited');
    } catch (err) { next(err); }
  },

  /** PATCH /academic-plan/:id/days/move */
  async moveDay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = moveDaySchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const plan = await academicPlanService.moveDay(req.params.id, data, ctx);
      sendSuccess(res, plan, 'Days swapped');
    } catch (err) { next(err); }
  },

  /** PATCH /academic-plan/chapters/:id/sizing */
  async updateChapterSizing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = chapterSizingSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const chapter = await academicPlanService.updateChapterSizing(req.params.id, data, ctx);
      sendSuccess(res, chapter, 'Chapter sizing saved');
    } catch (err) { next(err); }
  },

  // ── Principal (read-only) ────────────────────────────────────────────────

  /** GET /academic-plan/principal/overview */
  async getPrincipalOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const overview = await academicPlanService.getPrincipalOverview(ctx);
      sendSuccess(res, overview);
    } catch (err) { next(err); }
  },

  /** GET /academic-plan/principal/:teacherId?class=&section=&subject= */
  async getForTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = planTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const plan = await academicPlanService.getForTeacher(req.params.teacherId, query, ctx);
      sendSuccess(res, plan);
    } catch (err) { next(err); }
  },

  // ── Plan Alerts (automation) ──────────────────────────────────────────────

  /** GET /academic-plan/alerts */
  async listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const alerts = await academicPlanService.listAlerts(ctx);
      sendSuccess(res, alerts);
    } catch (err) { next(err); }
  },

  /** PATCH /academic-plan/alerts/:id/resolve */
  async resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const alert = await academicPlanService.resolveAlert(req.params.id, ctx);
      sendSuccess(res, alert, 'Alert resolved');
    } catch (err) { next(err); }
  },

  /** POST /academic-plan/alerts/run — manual trigger, admin-only. */
  async runAlertDetection(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await academicPlanService.runAlertDetection();
      sendSuccess(res, result, 'Detection run complete');
    } catch (err) { next(err); }
  },
};
