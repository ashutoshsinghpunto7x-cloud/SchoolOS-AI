import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { env } from '../../config/env';
import { ValidationError, UnauthorizedError } from '../../middlewares/errorHandler';
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  pruneStaleRefreshCookies,
} from '../../lib/auth-cookies';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip ?? req.socket.remoteAddress;
      const { refreshToken, ...result } = await authService.login(req.body, ip);
      setAuthCookies(res, refreshToken, result.sessionId);
      pruneStaleRefreshCookies(req, res);
      // Web relies solely on the httpOnly cookie above — the browser sends it
      // automatically, and keeping it out of the JSON body means it's never
      // reachable from page JS. React Native has no equivalent cookie jar
      // shared with axios/SecureStore, so mobile clients (identified by this
      // header, set once in apps/mobile's api client) get it in the body too,
      // to store in the OS keychain themselves. See LoginResponse.refreshToken.
      const isMobileClient = req.header('x-client-platform') === 'mobile';
      sendCreated(res, isMobileClient ? { ...result, refreshToken } : result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // The client (tab-scoped sessionStorage) tells us which of its own
      // sessions it's refreshing — see auth-cookies.ts for why the cookie
      // itself can't be looked up by a fixed name any more.
      const sessionId = req.header('x-session-id');
      if (!sessionId) {
        next(new UnauthorizedError('No session — please log in again'));
        return;
      }
      const refreshToken = getRefreshTokenFromRequest(req, sessionId);
      if (!refreshToken) {
        next(new UnauthorizedError('No refresh token — please log in again'));
        return;
      }
      const tokens = await authService.refresh(refreshToken, sessionId);
      setAuthCookies(res, tokens.refreshToken, sessionId);
      pruneStaleRefreshCookies(req, res);
      const isMobileClient = req.header('x-client-platform') === 'mobile';
      sendSuccess(
        res,
        isMobileClient ? tokens : { accessToken: tokens.accessToken },
        'Tokens refreshed'
      );
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, schoolId, firstName, lastName } = req.user!;
      await authService.logout(userId, schoolId, `${firstName} ${lastName}`, req.ip ?? undefined);
      const sessionId = req.header('x-session-id');
      if (sessionId) clearAuthCookies(res, sessionId);
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
