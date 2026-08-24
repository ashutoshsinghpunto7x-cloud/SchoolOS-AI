import { Response, Request } from 'express';
import { env } from '../config/env';

const REFRESH_COOKIE_PREFIX = 'refreshToken';
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

// The cookie name is suffixed with the caller's sessionId (a random id minted
// at login, carried client-side in sessionStorage — i.e. tab-scoped, same as
// the access token). Cookies are NOT tab-scoped: they're shared by every tab
// of the same browser. On a shared front-office computer, two staff logging
// into two different accounts in two different tabs used to collide on one
// fixed `refreshToken` cookie name — whichever login happened last silently
// won the cookie, and the *other* tab's next token refresh would come back
// authenticated as the wrong person (session hijack via cookie clobbering).
// Suffixing the name lets both sessions' refresh tokens coexist as separate
// cookies, and the caller must know its own sessionId to read its own cookie.
function cookieName(sessionId: string): string {
  return `${REFRESH_COOKIE_PREFIX}_${sessionId}`;
}

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
export function setAuthCookies(res: Response, refreshToken: string, sessionId: string): void {
  res.cookie(cookieName(sessionId), refreshToken, cookieOptions);
}

export function clearAuthCookies(res: Response, sessionId: string): void {
  res.clearCookie(cookieName(sessionId), { path: cookieOptions.path });
}

export function getRefreshTokenFromRequest(req: Request, sessionId: string): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[cookieName(sessionId)];
}
