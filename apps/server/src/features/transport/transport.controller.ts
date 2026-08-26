import { Request, Response, NextFunction } from 'express';
import { transportService } from './transport.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const transportController = {
  // ── Admin / Principal ────────────────────────────────────────────────────────

  async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.listVehicles(ctx);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.createVehicle(req.body, ctx);
      sendCreated(res, data, 'Vehicle created');
    } catch (err) { next(err); }
  },

  async assignDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.assignDriver(req.params.id, req.body, ctx);
      sendSuccess(res, data, 'Driver assigned');
    } catch (err) { next(err); }
  },

  async assignStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.assignStudents(req.params.id, req.body, ctx);
      sendSuccess(res, data, 'Students assigned');
    } catch (err) { next(err); }
  },

  async listVehicleStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.listVehicleStudents(req.params.id, ctx);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async listDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.listDrivers(ctx);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async listAllLive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.listAllLive(ctx);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  // ── Driver ───────────────────────────────────────────────────────────────────

  async getMyVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.getMyVehicle(ctx);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async ping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await transportService.ping(req.body, ctx);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },

  async endRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await transportService.endRoute(ctx);
      sendSuccess(res, null, 'Route ended');
    } catch (err) { next(err); }
  },

  // ── Parent ───────────────────────────────────────────────────────────────────

  async getLiveForParent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const childId = typeof req.query.childId === 'string' ? req.query.childId : undefined;
      const data = await transportService.getLiveForParent(ctx, childId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  },
};
