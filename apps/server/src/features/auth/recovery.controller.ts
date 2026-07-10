import { Request, Response, NextFunction } from 'express';
import { recoveryService } from './recovery.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import type { RecoveryRequestStatus } from './recovery-request.model';

function meta(req: Request) {
  return { ip: req.ip ?? req.socket.remoteAddress, userAgent: req.headers['user-agent'] };
}

export const recoveryController = {
  async submitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await recoveryService.submitRequest(req.body, meta(req));
      sendCreated(res, null, 'Your recovery request has been sent to your school administrator. You will be able to log in once your request is approved.');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const status = typeof req.query.status === 'string' ? (req.query.status as RecoveryRequestStatus) : undefined;
      const requests = await recoveryService.listRequests(ctx.schoolId, status);
      sendSuccess(res, requests);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const request = await recoveryService.getRequest(req.params.id, ctx.schoolId);
      sendSuccess(res, request);
    } catch (err) { next(err); }
  },

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await recoveryService.approveRequest(req.params.id, ctx);
      sendSuccess(res, result, result.emailed ? 'Approved — the temporary password was emailed to the staff member.' : 'Approved — share the temporary password securely, it will not be shown again.');
    } catch (err) { next(err); }
  },

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const request = await recoveryService.rejectRequest(req.params.id, req.body, ctx);
      sendSuccess(res, request, 'Recovery request rejected');
    } catch (err) { next(err); }
  },

  async completePasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await recoveryService.completePasswordReset(req.body, ctx);
      sendSuccess(res, null, 'Password updated');
    } catch (err) { next(err); }
  },

  async completePinReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await recoveryService.completePinReset(req.body, ctx);
      sendSuccess(res, null, 'PIN set');
    } catch (err) { next(err); }
  },

  async setupPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await recoveryService.setupPin(req.body, ctx, meta(req));
      sendSuccess(res, result, 'PIN created — this device will be remembered.');
    } catch (err) { next(err); }
  },

  async loginWithPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await recoveryService.loginWithPin(req.body, meta(req));
      sendCreated(res, result, 'Login successful');
    } catch (err) { next(err); }
  },

  async forgetDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await recoveryService.forgetDevice(req.params.deviceId);
      sendSuccess(res, null, 'Device forgotten');
    } catch (err) { next(err); }
  },
};
