import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { analyticsQuerySchema, saveReportSchema } from './reports.validation';
import { auditService } from '../audit/audit.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import type { ReportCategory, ReportFilters } from '@schoolos/types';

export const reportsController = {
  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const parsed = analyticsQuerySchema.parse({ category: req.params.category, ...req.query });
      const filters: ReportFilters = {
        dateFrom:     parsed.dateFrom,
        dateTo:       parsed.dateTo,
        class:        parsed.class,
        section:      parsed.section,
        academicYear: parsed.academicYear,
      };

      const data = await reportsService.getAnalytics(ctx.schoolId, parsed.category as ReportCategory, filters);

      auditService.log({
        userId:          ctx.userId,
        userDisplayName: ctx.displayName,
        action:          'report.generated',
        resource:        'reports',
        resourceId:      parsed.category,
        details:         { category: parsed.category, filters },
        ip:              ctx.ip,
        schoolId:        ctx.schoolId,
      });

      sendSuccess(res, data, 'Report generated');
    } catch (err) {
      next(err);
    }
  },

  async listSavedReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await reportsService.listSavedReports(ctx.schoolId);
      sendSuccess(res, data, 'Saved reports fetched');
    } catch (err) {
      next(err);
    }
  },

  async saveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!, req.ip ?? undefined);
      const input = saveReportSchema.parse(req.body);
      const saved = await reportsService.saveReport(
        ctx.schoolId, ctx.userId, ctx.displayName,
        {
          name:        input.name,
          description: input.description,
          category:    input.category as ReportCategory,
          filters:     input.filters,
          isPublic:    input.isPublic,
        },
      );

      auditService.log({
        userId:          ctx.userId,
        userDisplayName: ctx.displayName,
        action:          'report.saved',
        resource:        'reports',
        resourceId:      saved.id,
        details:         { name: saved.name, category: saved.category },
        ip:              ctx.ip,
        schoolId:        ctx.schoolId,
      });

      sendCreated(res, saved, 'Report saved');
    } catch (err) {
      next(err);
    }
  },

  async getSavedReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await reportsService.getSavedReport(req.params.id, ctx.schoolId);
      sendSuccess(res, data, 'Saved report fetched');
    } catch (err) {
      next(err);
    }
  },

  async deleteSavedReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await reportsService.deleteSavedReport(req.params.id, ctx.schoolId);

      auditService.log({
        userId:          ctx.userId,
        userDisplayName: ctx.displayName,
        action:          'report.deleted',
        resource:        'reports',
        resourceId:      req.params.id,
        ip:              ctx.ip,
        schoolId:        ctx.schoolId,
      });

      sendSuccess(res, null, 'Report deleted');
    } catch (err) {
      next(err);
    }
  },
};
