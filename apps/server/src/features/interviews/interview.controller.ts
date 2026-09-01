import { Request, Response, NextFunction } from 'express';
import { interviewService } from './interview.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const interviewController = {
  async schedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const interview = await interviewService.scheduleInterview(req.body, ctx);
      sendCreated(res, interview, 'Interview scheduled');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await interviewService.listInterviews(req.query, ctx);
      sendPaginated(res, result.interviews, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getByCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const interviews = await interviewService.getByCandidate(req.params.candidateId, ctx);
      sendSuccess(res, interviews);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const interview = await interviewService.getInterview(req.params.id, ctx);
      sendSuccess(res, interview);
    } catch (err) { next(err); }
  },

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const interview = await interviewService.setStatus(req.params.id, req.body, ctx);
      sendSuccess(res, interview, `Interview marked as ${interview.status}`);
    } catch (err) { next(err); }
  },

  async reschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const interview = await interviewService.reschedule(req.params.id, req.body, ctx);
      sendSuccess(res, interview, 'Interview rescheduled');
    } catch (err) { next(err); }
  },

  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const interview = await interviewService.submitFeedback(req.params.id, req.body, ctx);
      sendSuccess(res, interview, 'Feedback submitted');
    } catch (err) { next(err); }
  },

  async deleteInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await interviewService.deleteInterview(req.params.id, ctx);
      sendSuccess(res, null, 'Interview deleted');
    } catch (err) { next(err); }
  },
};
