import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './lib/logger';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import router from './routes';

const app: Application = express();

// Vercel (and other reverse proxies) set X-Forwarded-For; trust one proxy hop so
// express-rate-limit and req.ip work correctly.
app.set('trust proxy', 1);

// On serverless platforms (e.g. Vercel) this module is imported directly as the
// request handler and server.ts's start() — which normally calls this — never runs.
connectDatabase().catch((error) => {
  logger.error('MongoDB connection failed', { error: String(error), message: (error as Error).message });
});

// ── Security ──────────────────────────────────────────────────────────────────
// FRONTEND_URL may be a comma-separated list (e.g. the old Vercel URL + a custom
// domain during a DNS/SSL cutover) rather than a single origin — trim each entry
// so accidental whitespace around commas doesn't cause a silent mismatch against
// the browser's Origin header. These combine with a fixed baseline of known
// frontend origins so a misconfigured env var can't lock out production traffic.
const baselineOrigins = [
  'https://fnicschool.com',
  'https://www.fnicschool.com',
  'https://fnic.vercel.app',
];
const envOrigins = env.FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set([...baselineOrigins, ...envOrigins]));
// Vite may fall back to another port (5174, 5175, ...) if 5173 is already taken
// by another running dev server — allow any localhost port rather than a fixed one.
const isLocalhostOrigin = (origin: string): boolean => /^https?:\/\/localhost:\d+$/.test(origin);

app.use(helmet());
app.use(
  cors({
    // Passing a function (rather than an array or a raw string) guarantees the
    // response ever carries a single, exact-match Access-Control-Allow-Origin
    // value — never a joined list, which is what triggers "multiple values ...
    // only one is allowed" in the browser.
    origin: (origin, callback) => {
      // No Origin header = same-origin, server-to-server, or a non-browser
      // client (curl, health checks) — nothing to restrict.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logging ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
