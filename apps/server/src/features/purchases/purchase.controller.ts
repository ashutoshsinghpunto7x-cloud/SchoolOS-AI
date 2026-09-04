import { Request, Response, NextFunction } from 'express';
import { purchaseService } from './purchase.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const purchaseController = {
  // Purchase Requests
  async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await purchaseService.createRequest(req.body, ctx);
      sendCreated(res, request, 'Purchase request raised');
    } catch (err) { next(err); }
  },

  async listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await purchaseService.listRequests(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async pendingRequestCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const count = await purchaseService.countPendingRequests(ctx);
      sendSuccess(res, { count });
    } catch (err) { next(err); }
  },

  async getRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await purchaseService.getRequestById(req.params.id, ctx);
      sendSuccess(res, request);
    } catch (err) { next(err); }
  },

  async approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await purchaseService.decideRequest(req.params.id, 'approved', req.body, ctx);
      sendSuccess(res, request, 'Request approved');
    } catch (err) { next(err); }
  },

  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await purchaseService.decideRequest(req.params.id, 'rejected', req.body, ctx);
      sendSuccess(res, request, 'Request rejected');
    } catch (err) { next(err); }
  },

  // Purchase Orders
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const order = await purchaseService.createOrder(req.body, ctx);
      sendCreated(res, order, 'Purchase order issued');
    } catch (err) { next(err); }
  },

  async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await purchaseService.listOrders(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const order = await purchaseService.getOrderById(req.params.id, ctx);
      sendSuccess(res, order);
    } catch (err) { next(err); }
  },

  async receiveOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const order = await purchaseService.receiveOrder(req.params.id, req.body, ctx);
      sendSuccess(res, order, 'Order receipt recorded');
    } catch (err) { next(err); }
  },
};
