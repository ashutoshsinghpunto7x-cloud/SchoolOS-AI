import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { worksheetService } from './worksheet.service';
import { generateWorksheetSchema, saveWorksheetSchema, listWorksheetsSchema } from './worksheet.validation';

export const worksheetController = {
  /** POST /worksheet-generator/generate — pulls from the bank + AI-fills any shortfall, never saved */
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = generateWorksheetSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const result = await worksheetService.generate(input, ctx);
      sendSuccess(res, result, 'Worksheet drafted');
    } catch (err) { next(err); }
  },

  /** POST /worksheet-generator — save the reviewed/edited draft */
  async save(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = saveWorksheetSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const worksheet = await worksheetService.save(data, ctx);
      sendCreated(res, worksheet, 'Worksheet saved');
    } catch (err) { next(err); }
  },

  /** GET /worksheet-generator */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listWorksheetsSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const result = await worksheetService.list(query, ctx);
      sendPaginated(res, result.worksheets, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** GET /worksheet-generator/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const worksheet = await worksheetService.getById(req.params.id, ctx);
      sendSuccess(res, worksheet);
    } catch (err) { next(err); }
  },

  /** DELETE /worksheet-generator/:id */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await worksheetService.delete(req.params.id, ctx);
      sendSuccess(res, null, 'Worksheet deleted');
    } catch (err) { next(err); }
  },
};
