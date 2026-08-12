import { Request, Response, NextFunction } from 'express';
import { moduleAccessService } from './module-restriction.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const moduleAccessController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await moduleAccessService.listAll();
      sendSuccess(res, rows);
    } catch (err) { next(err); }
  },

  async bulkSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      await moduleAccessService.bulkSet(req.body, ctx);
      sendSuccess(res, null, req.body?.restricted ? 'Selected modules restricted' : 'Selected modules restored');
    } catch (err) { next(err); }
  },

  /** GET /api/module-access/status — authenticated (any role); every tab's
   *  AppLayout polls this to know which modules to block right now. */
  async status(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await moduleAccessService.getRestrictedStatus();
      sendSuccess(res, status);
    } catch (err) { next(err); }
  },
};
