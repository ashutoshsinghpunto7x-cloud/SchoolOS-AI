import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { recordSecurityEvent } from '../lib/security-events';

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

// Local-only headroom for load testing (e.g. Artillery). Production is completely
// untouched — it still resolves to exactly `env.RATE_LIMIT_MAX` as before, since
// isDevelopment is only true when NODE_ENV === 'development'.
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isDevelopment ? 100_000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
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
