import { Request, Response, NextFunction } from 'express';
import { opsSchoolsService } from './ops-schools.service';
import { sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const opsSchoolsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await opsSchoolsService.createSchool(req.body, ctx);
      sendCreated(res, data);
    } catch (err) { next(err); }
  },
};
