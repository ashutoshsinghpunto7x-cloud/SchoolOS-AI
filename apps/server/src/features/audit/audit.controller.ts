import { Request, Response, NextFunction } from 'express';
import { auditRepository } from './audit.repository';
import { listAuditSchema } from './audit.validation';
import { sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const auditController = {
  /** GET /audit — filtered history for a resource (e.g. ?resource=salary). */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const opts   = listAuditSchema.parse(req.query);
      const result = await auditRepository.findAll(ctx.schoolId, opts);
      sendPaginated(res, result.logs, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },
};
