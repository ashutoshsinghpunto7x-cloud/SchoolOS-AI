import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { deviceTokenService } from './device-token.service';

export const deviceTokenController = {
  /** POST /users/me/device-tokens */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      const result = await deviceTokenService.register(req.body, ctx);
      sendSuccess(res, result, 'Device registered for push notifications');
    } catch (err) { next(err); }
  },

  /** DELETE /users/me/device-tokens/:token */
  async unregister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      await deviceTokenService.unregister(req.params.token, ctx);
      sendSuccess(res, null, 'Device unregistered');
    } catch (err) { next(err); }
  },
};
