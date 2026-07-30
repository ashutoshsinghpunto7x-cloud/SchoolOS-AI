import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { lessonPlanService } from './lesson-plan.service';
import { generateLessonPlanSchema, saveLessonPlanSchema, updateLessonPlanSchema, listLessonPlansSchema } from './lesson-plan.validation';

export const lessonPlanController = {
  /** POST /lesson-planner/generate — AI drafts a plan, never saved */
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = generateLessonPlanSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const content = await lessonPlanService.generate(input, ctx);
      sendSuccess(res, content, 'Lesson plan drafted');
    } catch (err) { next(err); }
  },

  /** POST /lesson-planner — save the reviewed/edited draft */
  async save(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = saveLessonPlanSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const plan = await lessonPlanService.save(data, ctx);
      sendCreated(res, plan, 'Lesson plan saved');
    } catch (err) { next(err); }
  },

  /** GET /lesson-planner */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listLessonPlansSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const result = await lessonPlanService.list(query, ctx);
      sendPaginated(res, result.lessonPlans, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** GET /lesson-planner/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const plan = await lessonPlanService.getById(req.params.id, ctx);
      sendSuccess(res, plan);
    } catch (err) { next(err); }
  },

  /** PATCH /lesson-planner/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateLessonPlanSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const plan = await lessonPlanService.update(req.params.id, data, ctx);
      sendSuccess(res, plan, 'Lesson plan updated');
    } catch (err) { next(err); }
  },

  /** DELETE /lesson-planner/:id */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await lessonPlanService.delete(req.params.id, ctx);
      sendSuccess(res, null, 'Lesson plan deleted');
    } catch (err) { next(err); }
  },
};
