import { Request, Response, NextFunction } from 'express';
import { maintenanceService } from './maintenance.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const maintenanceController = {
  async getState(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = await maintenanceService.getState();
      sendSuccess(res, state);
    } catch (err) { next(err); }
  },

  async schedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const state = await maintenanceService.schedule(req.body, ctx);
      sendSuccess(res, state, 'Maintenance window scheduled');
    } catch (err) { next(err); }
  },

  async cancelSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const state = await maintenanceService.cancelSchedule(ctx);
      sendSuccess(res, state, 'Scheduled maintenance cancelled');
    } catch (err) { next(err); }
  },

  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const state = await maintenanceService.setActive(req.body, ctx);
      sendSuccess(res, state, 'Maintenance mode updated');
    } catch (err) { next(err); }
  },

  /** GET /api/maintenance/status — unauthenticated, hit by the login page, the
   *  Under Maintenance screen, and every logged-in tab's ProtectedRoute check. */
  async status(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await maintenanceService.getStatus();
      sendSuccess(res, status);
    } catch (err) { next(err); }
  },
};
