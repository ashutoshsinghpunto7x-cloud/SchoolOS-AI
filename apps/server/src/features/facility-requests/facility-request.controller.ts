import { Request, Response, NextFunction } from 'express';
import { facilityRequestService } from './facility-request.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const facilityRequestController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await facilityRequestService.createRequest(req.body, ctx);
      sendCreated(res, request, 'Facility request raised');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await facilityRequestService.listRequests(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async openCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const count = await facilityRequestService.countOpen(ctx);
      sendSuccess(res, { count });
    } catch (err) { next(err); }
  },

  async slaReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const report = await facilityRequestService.slaReport(ctx);
      sendSuccess(res, report);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await facilityRequestService.getById(req.params.id, ctx);
      sendSuccess(res, request);
    } catch (err) { next(err); }
  },

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await facilityRequestService.assign(req.params.id, req.body, ctx);
      sendSuccess(res, request, 'Ticket assigned');
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await facilityRequestService.updateStatus(req.params.id, req.body, ctx);
      sendSuccess(res, request, 'Ticket updated');
    } catch (err) { next(err); }
  },
};
