import jwt from 'jsonwebtoken';
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

// Every login/refresh mints a differently-named cookie (see cookieName above),
// and nothing ever expired the old ones short of an explicit logout — a
// browser that's logged in repeatedly over days/weeks (any dev/test browser,
// or just someone who never hits "logout") piles up one refreshToken_* cookie
// per past session, all still within their 7-day maxAge. Once the resulting
// Cookie header outgrows the server's header-size limit, EVERY request to
// /api/v1/auth/* — including login itself — gets hard-rejected with 431
// before it's even routed, which surfaces to the browser as a bare CORS/
// network error with no way to log in or clear the cookies from the app.
//
// Self-heal on every login/refresh: keep only the KEEP most recently-issued
// refresh cookies (by JWT `iat`, decoded without verifying — this must also
// prune garbage/forged cookie values, so we can't require a valid signature)
// and clear the rest. Bounds the header size regardless of how long the
// browser has been reused, without touching other tabs' live sessions.
const KEEP_MOST_RECENT_SESSIONS = 5;

export function pruneStaleRefreshCookies(req: Request, res: Response): void {
  const cookies = req.cookies as Record<string, string> | undefined;
  if (!cookies) return;

  const entries = Object.keys(cookies)
    .filter((name) => name.startsWith(`${REFRESH_COOKIE_PREFIX}_`))
    .map((name) => {
      const decoded = jwt.decode(cookies[name]) as { iat?: number } | null;
      return { name, iat: decoded?.iat ?? 0 };
    })
    .sort((a, b) => b.iat - a.iat);

  entries.slice(KEEP_MOST_RECENT_SESSIONS).forEach(({ name }) => {
    res.clearCookie(name, { path: cookieOptions.path });
  });
}

export function clearAuthCookies(res: Response, sessionId: string): void {
  res.clearCookie(cookieName(sessionId), { path: cookieOptions.path });
}

export function getRefreshTokenFromRequest(req: Request, sessionId: string): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[cookieName(sessionId)];
}
