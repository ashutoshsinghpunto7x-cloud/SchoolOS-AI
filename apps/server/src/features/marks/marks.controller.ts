import { Request, Response, NextFunction } from 'express';
import { marksService } from './marks.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const marksController = {
  /** POST /marks — save/edit a single student's marks (draft) */
  async upsertSingle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await marksService.upsertSingle(req.body, ctx);
      sendCreated(res, record, 'Marks saved');
    } catch (err) { next(err); }
  },

  /** POST /marks/bulk — save/edit a class's marks in one call */
  async bulkUpsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const records = await marksService.bulkUpsert(req.body, ctx);
      sendCreated(res, records, `${records.length} marks records saved`);
    } catch (err) { next(err); }
  },

  /** GET /marks/entry-table — roster merged with existing marks, for the editable grid */
  async getEntryTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.getEntryTable(req.query, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  /** GET /marks/summary — KPI strip counts */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const summary = await marksService.getSummary(req.query, ctx);
      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },

  /** GET /marks — list with filters */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.listAll(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** GET /marks/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const record = await marksService.getById(req.params.id, ctx);
      sendSuccess(res, record);
    } catch (err) { next(err); }
  },

  /** POST /marks/submit — teacher submits a class+subject+exam batch for review */
  async submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.submitForReview(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) submitted for review`);
    } catch (err) { next(err); }
  },

  /** POST /marks/approve */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.approve(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) approved`);
    } catch (err) { next(err); }
  },

  /** POST /marks/request-correction */
  async requestCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.requestCorrection(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) sent back for correction`);
    } catch (err) { next(err); }
  },

  /** POST /marks/publish */
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.publish(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) published`);
    } catch (err) { next(err); }
  },

  /** POST /marks/lock */
  async lock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.lock(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) locked`);
    } catch (err) { next(err); }
  },

  /** POST /marks/reopen */
  async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await marksService.reopen(req.body, ctx);
      sendSuccess(res, result, `${result.updated} record(s) reopened`);
    } catch (err) { next(err); }
  },
};
