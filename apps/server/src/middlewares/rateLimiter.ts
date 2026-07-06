import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const rateLimitResponse = (message: string) => ({
  success: false,
  error: { message, code: 'RATE_LIMIT_EXCEEDED', statusCode: 429 },
});

const isDevelopment = process.env.NODE_ENV === "development";

// Local-only headroom for load testing (e.g. Artillery). Production is completely
// untouched — it still resolves to exactly `env.RATE_LIMIT_MAX` as before, since
// isDevelopment is only true when NODE_ENV === 'development'.
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isDevelopment ? 100_000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many requests. Please slow down.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse(
    "Too many login attempts. Please try again in 15 minutes."
  ),
});
