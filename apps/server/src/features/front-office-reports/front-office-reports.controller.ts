import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess } from '../../lib/response';
import { reportDateRangeSchema, resolveDateRange } from './front-office-reports.validation';
import { getAdmissionsReport } from './admissions-report.service';
import { getRecruitmentReport } from './recruitment-report.service';
import { getVisitorReport } from './visitor-report.service';

export const frontOfficeReportsController = {
  async getAdmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const { dateFrom, dateTo } = reportDateRangeSchema.parse(req.query);
      const { start, end } = resolveDateRange(dateFrom, dateTo);
      const data = await getAdmissionsReport(ctx.schoolId, start, end);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getRecruitment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const { dateFrom, dateTo } = reportDateRangeSchema.parse(req.query);
      const { start, end } = resolveDateRange(dateFrom, dateTo);
      const data = await getRecruitmentReport(ctx.schoolId, start, end);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async getVisitors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const { dateFrom, dateTo } = reportDateRangeSchema.parse(req.query);
      const { start, end } = resolveDateRange(dateFrom, dateTo);
      const data = await getVisitorReport(ctx.schoolId, start, end);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },
};
