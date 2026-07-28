import { Response, Request } from 'express';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';
// Matches token.service.ts's REFRESH_EXPIRES ('7d') — kept as a separate
// constant since jwt.sign wants a string ('7d') and res.cookie wants ms.
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Frontend and backend are different origins (fnicschool.com vs onrender.com),
// so the refresh cookie must be sent cross-site: that requires SameSite=None
// + Secure. Browsers make an exception for http://localhost without Secure,
// so local dev over plain HTTP still works with sameSite 'lax'.
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  // Scoped to the auth routes only — no reason for this cookie to go out on
  // every API request.
  path: '/api/v1/auth',
  maxAge: REFRESH_MAX_AGE_MS,
};

/**
 * Sets the refresh token as an httpOnly cookie — unreadable by JS, so an XSS
 * payload can no longer exfiltrate a 7-day-lived credential the way it could
 * when the refresh token lived in sessionStorage.
 *
 * No separate CSRF cookie: a cross-domain double-submit cookie (frontend on
 * fnicschool.com, backend on onrender.com) doesn't work — document.cookie
 * can't read a cookie set by a different domain, so the frontend would never
 * be able to echo it back. verifyCsrf instead uses the custom-header defense
 * (see middlewares/csrf.ts) — CORS already blocks any origin we didn't
 * allowlist, so requiring *any* custom header on this route is sufficient.
 */
export function setAuthCookies(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: cookieOptions.path });
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
}
