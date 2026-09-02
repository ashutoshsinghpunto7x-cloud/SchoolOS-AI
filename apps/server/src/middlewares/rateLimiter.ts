import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { recordSecurityEvent } from '../lib/security-events';
import { tokenService } from '../features/auth/token.service';

const rateLimitResponse = (message: string) => ({
  success: false,
  error: { message, code: 'RATE_LIMIT_EXCEEDED', statusCode: 429 },
});

// express-rate-limit's `message` option responds directly without going
// through errorHandler.ts, so the security-event recording has to happen
// here via `handler` rather than the shared 401/403 hook in errorHandler.ts.
// standardHeaders:true means express-rate-limit already computed
// limit/remaining/reset onto the response — read those back rather than
// re-deriving them, so a 429 never needs guessing "why".
const makeRateLimitHandler = (message: string, identifierFrom?: (req: Request) => string | undefined) =>
  (req: Request, res: Response) => {
    const limit = Number(res.getHeader('RateLimit-Limit')) || undefined;
    const remaining = Number(res.getHeader('RateLimit-Remaining')) || 0;
    const resetSeconds = Number(res.getHeader('RateLimit-Reset')) || undefined;

    recordSecurityEvent({
      type: 'rate_limited',
      severity: 'medium',
      message,
      ip: req.ip,
      path: req.originalUrl,
      userId: req.user?.userId,
      role: req.user?.role,
      schoolId: req.user?.schoolId,
      limit,
      remaining,
      retryAfterSeconds: resetSeconds,
      identifier: identifierFrom?.(req),
    });
    res.status(429).json(rateLimitResponse(message));
  };

const isDevelopment = process.env.NODE_ENV === "development";

// apiLimiter runs ahead of the `authenticate` middleware (it's mounted on all of
// `/api/` before the versioned router), so req.user isn't populated yet here.
// Verify the access token directly to key on the actual signed-in user instead
// of falling back to express-rate-limit's default IP-only key. Without this,
// every teacher behind the same school Wi-Fi/NAT or mobile hotspot shares one
// bucket — a handful of people polling notifications/feature-flags and saving
// attendance concurrently was enough to trip "too many requests" for everyone
// on that IP, including teachers who'd made almost no requests themselves.
// A forged/expired token just falls back to IP-keying (same as before), so this
// only ever narrows the bucket a request lands in — it can't be used to dodge
// the limit in a way that hurts anyone else.
const keyGenerator = (req: Request): string => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = tokenService.verifyAccessToken(header.slice(7));
      return `user:${payload.userId}`;
    } catch {
      // fall through to IP-keying below
    }
  }
  return ipKeyGenerator(req.ip ?? '');
};

// Local-only headroom for load testing (e.g. Artillery). Production is completely
// untouched — it still resolves to exactly `env.RATE_LIMIT_MAX` as before, since
// isDevelopment is only true when NODE_ENV === 'development'.
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isDevelopment ? 100_000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: makeRateLimitHandler('Too many requests. Please slow down.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeRateLimitHandler('Too many login attempts. Please try again in 15 minutes.'),
});

// authLimiter above is IP-keyed only — a distributed attacker spraying login
// attempts for one account across many IPs isn't slowed by it at all. This
// limiter is keyed on the submitted identifier (email/username) instead, so
// it caps attempts against a single account regardless of source IP. Applied
// alongside authLimiter, not instead of it — the two catch different attack
// shapes (one attacker/many accounts vs. many attackers/one account).
export const authAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const identifier = (req.body as { identifier?: string } | undefined)?.identifier;
    return typeof identifier === 'string' ? identifier.trim().toLowerCase() : 'unknown';
  },
  handler: makeRateLimitHandler(
    'Too many login attempts for this account. Please try again in 15 minutes.',
    (req) => (req.body as { identifier?: string } | undefined)?.identifier,
  ),
});

// /login-pin has no `identifier` field (it authenticates via `deviceId` +
// PIN, not email/username), so it was only ever covered by the IP-keyed
// authLimiter — a low-entropy 4-6 digit PIN can be brute-forced against one
// known deviceId by spreading attempts across IPs. This keys on deviceId
// instead, same role as authAccountLimiter but for the PIN login path.
export const pinLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const deviceId = (req.body as { deviceId?: string } | undefined)?.deviceId;
    return typeof deviceId === 'string' ? deviceId.trim() : 'unknown';
  },
  handler: makeRateLimitHandler(
    'Too many PIN attempts for this device. Please try again in 15 minutes.',
    (req) => (req.body as { deviceId?: string } | undefined)?.deviceId,
  ),
});

// Passkey login is discoverable/usernameless — there's no identifier field in the request body at
// all (not even a deviceId, unlike /login-pin), so this can only be keyed on IP (the library's
// default keyGenerator). Kept as its own bucket rather than folding into authLimiter so a burst of
// failed passkey attempts can't also lock a user out of password/PIN login from the same IP.
export const webauthnLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeRateLimitHandler('Too many passkey sign-in attempts. Please try again in 15 minutes.'),
});
