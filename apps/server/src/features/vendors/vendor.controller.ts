import { Request, Response, NextFunction } from 'express';
import { vendorService } from './vendor.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const vendorController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const record = await vendorService.createVendor(req.body, ctx);
      sendCreated(res, record, 'Vendor created');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await vendorService.listVendors(req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getBillsSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
      const dateTo   = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
      const summary  = await vendorService.getBillsSummary(ctx, dateFrom, dateTo);
      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },

  async getOverdueBills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const bills = await vendorService.getOverdueBills(ctx);
      sendSuccess(res, bills);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const profile = await vendorService.getVendorProfile(req.params.id, ctx);
      sendSuccess(res, profile);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const record = await vendorService.updateVendor(req.params.id, req.body, ctx);
      sendSuccess(res, record, 'Vendor updated');
    } catch (err) { next(err); }
  },

  async deleteVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await vendorService.deleteVendor(req.params.id, ctx);
      sendSuccess(res, null, 'Vendor deleted');
    } catch (err) { next(err); }
  },

  async getLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const ledger = await vendorService.getVendorLedger(req.params.id, ctx);
      sendSuccess(res, ledger);
    } catch (err) { next(err); }
  },

  async listBills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await vendorService.listVendorBills(req.params.id, req.query, ctx);
      sendPaginated(res, result.records, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async createBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const bill = await vendorService.recordVendorBill(req.params.id, req.body, ctx);
      sendCreated(res, bill, 'Bill recorded');
    } catch (err) { next(err); }
  },

  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await vendorService.recordVendorPayment(req.params.id, req.body, ctx);
      sendCreated(res, result, 'Payment recorded');
    } catch (err) { next(err); }
  },
};
