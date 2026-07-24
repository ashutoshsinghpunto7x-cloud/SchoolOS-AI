import { Request, Response, NextFunction } from 'express';
import { opsService } from './ops.service';
import { sendPaginated, sendSuccess } from '../../lib/response';
import { auditTrailQuerySchema } from './ops.validation';

export const opsController = {
  async dashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getDashboard();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async schools(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getSchools();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async infrastructure(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getInfrastructure();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async security(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getSecurity();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async logs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { level, search, limit } = req.query as { level?: string; search?: string; limit?: string };
      const data = await opsService.getLogs({
        level,
        search,
        limit: limit ? Number(limit) : undefined,
      });
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async auditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const opts = auditTrailQuerySchema.parse(req.query);
      const result = await opsService.getAuditTrail(opts);
      sendPaginated(res, result.logs, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async applications(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getApplicationHealth();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async schoolDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getSchoolDetail(req.params.schoolId);
      if (!data) {
        res.status(404).json({ success: false, error: { message: 'School not found', code: 'NOT_FOUND', statusCode: 404 } });
        return;
      }
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },
};
