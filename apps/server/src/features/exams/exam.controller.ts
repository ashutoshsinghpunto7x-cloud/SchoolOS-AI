import { Request, Response, NextFunction } from 'express';
import { examService } from './exam.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const examController = {
  /** POST /exams */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const exam = await examService.create(req.body, ctx);
      sendCreated(res, exam, 'Exam created');
    } catch (err) { next(err); }
  },

  /** GET /exams */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await examService.listAll(req.query, ctx);
      sendPaginated(res, result.exams, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** GET /exams/class/:class — exams applicable to a class (for the teacher's filter bar) */
  async listForClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const exams = await examService.listForClass(req.params.class, ctx);
      sendSuccess(res, exams);
    } catch (err) { next(err); }
  },

  /** GET /exams/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const exam = await examService.getById(req.params.id, ctx);
      sendSuccess(res, exam);
    } catch (err) { next(err); }
  },

  /** PATCH /exams/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const exam = await examService.update(req.params.id, req.body, ctx);
      sendSuccess(res, exam, 'Exam updated');
    } catch (err) { next(err); }
  },

  /** PATCH /exams/:id/status */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const exam = await examService.updateStatus(req.params.id, req.body, ctx);
      sendSuccess(res, exam, 'Exam status updated');
    } catch (err) { next(err); }
  },

  /** DELETE /exams/:id */
  async deleteExam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await examService.deleteExam(req.params.id, ctx);
      sendSuccess(res, null, 'Exam deleted');
    } catch (err) { next(err); }
  },
};
