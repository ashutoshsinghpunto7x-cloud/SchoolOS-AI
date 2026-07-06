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
app.use(helmet());
app.use(
  cors({
    // In development, Vite may fall back to another port (5174, 5175, ...) if 5173
    // is already taken by another running dev server — allow any localhost port
    // rather than hardcoding one. Production stays locked to a single origin.
    origin: env.NODE_ENV === 'development'
      ? /^http:\/\/localhost:\d+$/
      : env.FRONTEND_URL,
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
