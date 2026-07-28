import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { env } from '../../config/env';
import { ValidationError, UnauthorizedError } from '../../middlewares/errorHandler';
import { setAuthCookies, clearAuthCookies, getRefreshTokenFromRequest } from '../../lib/auth-cookies';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip ?? req.socket.remoteAddress;
      const { refreshToken, ...result } = await authService.login(req.body, ip);
      setAuthCookies(res, refreshToken);
      sendCreated(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);
      if (!refreshToken) {
        next(new UnauthorizedError('No refresh token — please log in again'));
        return;
      }
      const tokens = await authService.refresh(refreshToken);
      setAuthCookies(res, tokens.refreshToken);
      sendSuccess(res, { accessToken: tokens.accessToken }, 'Tokens refreshed');
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, schoolId, firstName, lastName } = req.user!;
      await authService.logout(userId, schoolId, `${firstName} ${lastName}`, req.ip ?? undefined);
      clearAuthCookies(res);
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
      // No implicit fallback here on purpose — a silent 'DEMO_SCHOOL' default
      // previously caused an admin account to be seeded on a different tenant
      // than the school's real data, making every dashboard query it made
      // return empty results. Require the caller to say which school explicitly.
      if (!schoolId) {
        next(new ValidationError('schoolId is required in the request body — there is no default school.'));
        return;
      }
      const result = await authService.seedFirstAdmin(schoolId);
      sendCreated(res, result, 'Admin user seeded. Change the password after first login.');
    } catch (err) {
      next(err);
    }
  },
};
