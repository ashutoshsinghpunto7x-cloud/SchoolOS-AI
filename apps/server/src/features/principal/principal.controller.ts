import { Request, Response, NextFunction } from 'express';
import { principalService } from './principal.service';
import { getRecruitmentDashboard } from './principal-recruitment.service';
import { auditService } from '../audit/audit.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const principalController = {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await principalService.getDashboard(ctx.schoolId);

      auditService.log({
        userId: ctx.userId,
        userDisplayName: ctx.displayName,
        action: 'principal.dashboard.viewed',
        resource: 'principal',
        resourceId: ctx.schoolId,
        ip: ctx.ip,
        schoolId: ctx.schoolId,
      });

      sendSuccess(res, data, 'Dashboard loaded');
    } catch (err) {
      next(err);
    }
  },

  async getTeachersSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const data = await principalService.getTeachersSummary(ctx.schoolId, date);
      sendSuccess(res, data, 'Teachers summary loaded');
    } catch (err) {
      next(err);
    }
  },

  async getBriefingSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await principalService.getBriefingSummary(ctx.schoolId);

      auditService.log({
        userId: ctx.userId,
        userDisplayName: ctx.displayName,
        action: 'principal.briefing_summary.generated',
        resource: 'principal',
        resourceId: ctx.schoolId,
        ip: ctx.ip,
        schoolId: ctx.schoolId,
      });

      sendSuccess(res, data, 'Briefing summary generated');
    } catch (err) {
      next(err);
    }
  },

  /** Reception Management Module SRD, Module 7 — the Principal's combined
   *  recruitment + admissions overview (CVs awaiting review, forms pending
   *  verification, today's interviews/visitor appointments merged). */
  async getRecruitmentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await getRecruitmentDashboard(ctx.schoolId);
      sendSuccess(res, data, 'Recruitment dashboard loaded');
    } catch (err) {
      next(err);
    }
  },
};
