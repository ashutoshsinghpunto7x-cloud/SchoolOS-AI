import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess } from '../../lib/response';
import { syllabusTrackerService } from './syllabus-tracker.service';

export const syllabusTrackerController = {
  /** GET /syllabus-tracker/overview */
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const overview = await syllabusTrackerService.getOverview(ctx);
      sendSuccess(res, overview);
    } catch (err) { next(err); }
  },

  /** GET /syllabus-tracker/activity */
  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const activity = await syllabusTrackerService.getActivityHeatmap(ctx);
      sendSuccess(res, activity);
    } catch (err) { next(err); }
  },
};
