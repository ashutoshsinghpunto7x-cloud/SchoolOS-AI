import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { env } from '../../config/env';
import { ValidationError } from '../../middlewares/errorHandler';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip ?? req.socket.remoteAddress;
      const result = await authService.login(req.body, ip);
      sendCreated(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) {
        next(new ValidationError('refreshToken is required'));
        return;
      }
      const tokens = await authService.refresh(refreshToken);
      sendSuccess(res, tokens, 'Tokens refreshed');
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, schoolId, firstName, lastName } = req.user!;
      await authService.logout(userId, schoolId, `${firstName} ${lastName}`, req.ip ?? undefined);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.me(req.user!.userId);
      sendSuccess(res, user, 'User profile fetched');
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, schoolId, firstName, lastName } = req.user!;
      await authService.changePassword(userId, req.body, {
        schoolId,
        displayName: `${firstName} ${lastName}`,
        ip: req.ip ?? undefined,
      });
      sendSuccess(res, null, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  },

  async seed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (env.NODE_ENV !== 'development') {
        next(new ValidationError('Seed endpoint is only available in development'));
        return;
      }
      const { schoolId } = req.body as { schoolId?: string };
      const result = await authService.seedFirstAdmin(schoolId ?? 'DEMO_SCHOOL');
      sendCreated(res, result, 'Admin user seeded. Change the password after first login.');
    } catch (err) {
      next(err);
    }
  },
};
