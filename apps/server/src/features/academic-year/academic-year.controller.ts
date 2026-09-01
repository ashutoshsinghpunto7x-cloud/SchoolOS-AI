import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess } from '../../lib/response';
import { academicYearService } from './academic-year.service';
import { upsertAcademicYearSchema, addSpecialDaySchema } from './academic-year.validation';

export const academicYearController = {
  /** GET /academic-year/current */
  async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const year = await academicYearService.getOrSeedCurrent(ctx);
      sendSuccess(res, year);
    } catch (err) { next(err); }
  },

  /** PUT /academic-year/current — admin/principal only (route-gated) */
  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = upsertAcademicYearSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const year = await academicYearService.upsert(data, ctx);
      sendSuccess(res, year, 'Academic year saved');
    } catch (err) { next(err); }
  },

  /** POST /academic-year/current/special-days */
  async addSpecialDay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = addSpecialDaySchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const year = await academicYearService.addSpecialDay(data, ctx);
      sendSuccess(res, year, 'Special day added');
    } catch (err) { next(err); }
  },
};
