import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errorHandler';

/**
 * Custom-request-header CSRF check for cookie-authenticated routes — today
 * that's just /auth/refresh, since every other route authenticates via a
 * Bearer access token in the Authorization header, which a cross-site
 * request can't forge (no cookie involved, so nothing is auto-attached).
 *
 * The header's value doesn't need to be secret — its mere presence is the
 * defense. A plain HTML form (the classic CSRF vector) cannot attach a
 * custom header at all. A script-driven cross-origin request *can* attach
 * one, but only after a CORS preflight succeeds, and app.ts's CORS origin
 * allowlist already rejects any origin we didn't explicitly approve — so an
 * attacker's site can never get this far. (A double-submit cookie was
 * considered instead, but doesn't work here: frontend and backend are on
 * different domains in production, so frontend JS can't read a cookie the
 * backend set.)
 */
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers['x-csrf-token']) {
    next(new ForbiddenError('Missing CSRF header'));
    return;
  }
  next();
}
