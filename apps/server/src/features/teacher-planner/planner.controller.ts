import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { fileToDataUri } from '../../lib/image-upload';
import { sendSuccess, sendCreated } from '../../lib/response';
import { ValidationError } from '../../middlewares/errorHandler';
import { plannerExtractionService } from './planner-extraction.service';
import { plannerService, getSchoolAcademicYear } from './planner.service';
import { extractionTargetSchema, confirmPlannerSchema, toggleTaskSchema, plannerTargetSchema } from './planner.validation';

export const plannerController = {
  /** POST /teacher-planner/extract/image?class=8&subject=Science */
  async extractFromImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('An image file is required');
      const target = extractionTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const { start, end } = await getSchoolAcademicYear(ctx.schoolId);
      const job = await plannerExtractionService.enqueueExtractFromImage(target.class, target.subject, start, end, fileToDataUri(req.file), ctx);
      sendCreated(res, job, 'Reading the planner…');
    } catch (err) { next(err); }
  },

  /** POST /teacher-planner/extract/pdf?class=8&subject=Science */
  async extractFromPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('A PDF file is required');
      const target = extractionTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const { start, end } = await getSchoolAcademicYear(ctx.schoolId);
      const job = await plannerExtractionService.enqueueExtractFromPdf(target.class, target.subject, start, end, req.file.buffer, ctx);
      sendCreated(res, job, 'Reading the document…');
    } catch (err) { next(err); }
  },

  /** GET /teacher-planner/extract/jobs/:id */
  async getExtractionJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const job = await plannerExtractionService.getExtractionJob(req.params.id, ctx);
      sendSuccess(res, job);
    } catch (err) { next(err); }
  },

  /** POST /teacher-planner/confirm — save reviewed draft weeks as the teacher's planner */
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

  /** PATCH /teacher-planner/:id/tasks/:taskId */
  async toggleTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = toggleTaskSchema.parse({ taskId: req.params.taskId, status: req.body?.status });
      const ctx = buildAuthContext(req.user!);
      const planner = await plannerService.toggleTask(req.params.id, req.params.taskId, status, ctx);
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
};
