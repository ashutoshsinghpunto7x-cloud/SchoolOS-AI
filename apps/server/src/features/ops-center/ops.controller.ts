import { Request, Response, NextFunction } from 'express';
import { opsService } from './ops.service';
import { sendPaginated, sendSuccess } from '../../lib/response';
import { auditTrailQuerySchema, updateAlertSchema } from './ops.validation';
import { NotFoundError } from '../../middlewares/errorHandler';

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
        next(new NotFoundError('School'));
        return;
      }
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async errors(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getErrors();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async database(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getDatabase();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async deployments(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getDeployments();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async communications(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getCommunications();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async users(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.getUsersScreen();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async alerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await opsService.evaluateAlerts();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async updateAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updates = updateAlertSchema.parse(req.body);
      const { userId, firstName, lastName } = req.user!;
      const data = await opsService.updateAlert(req.params.alertKey, updates, {
        userId,
        name: `${firstName} ${lastName}`,
      });
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async settings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = opsService.getSettings();
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },
};
