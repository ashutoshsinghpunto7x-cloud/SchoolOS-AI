import { Request, Response, NextFunction } from 'express';
import { principalService } from './principal.service';
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
};
