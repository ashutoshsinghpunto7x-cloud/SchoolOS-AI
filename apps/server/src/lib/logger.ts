import os from 'os';
import winston from 'winston';
import { pushLog } from './log-buffer';
import { getRequestContext } from '../middlewares/requestContext';

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const isDevelopment = process.env.NODE_ENV !== 'production';
const INSTANCE_ID = process.env.RENDER_INSTANCE_ID || `${os.hostname()}:${process.pid}`;
const APP_VERSION = process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.npm_package_version || 'dev';

// Pulls the current request's id/correlation id/user/school from
// AsyncLocalStorage (see requestContext.ts) so every log line is traceable to
// the request that produced it without every call site threading `req`
// through manually.
const attachRequestContext = winston.format((info) => {
  const ctx = getRequestContext();
  if (ctx) {
    info.requestId = ctx.requestId;
    info.correlationId = ctx.correlationId;
    if (ctx.schoolId) info.schoolId = ctx.schoolId;
    if (ctx.userId) info.userId = ctx.userId;
    if (ctx.role) info.role = ctx.role;
  }
  info.env = process.env.NODE_ENV || 'development';
  info.instance = INSTANCE_ID;
  info.version = APP_VERSION;
  const mem = process.memoryUsage();
  info.memoryMb = Math.round((mem.rss / 1024 / 1024) * 10) / 10;
  return info;
})();

// Side-effect format — runs before colorize/json transform info.level/message,
// so the Ops Center Logs viewer sees the same plain values the console gets,
// just without ANSI color codes. Returns info unchanged.
const captureToBuffer = winston.format((info) => {
  const { level, message, ...meta } = info;
  pushLog({
    timestamp: new Date().toISOString(),
    level: String(level),
    message: typeof message === 'string' ? message : JSON.stringify(message),
    meta: Object.keys(meta).length ? (meta as Record<string, unknown>) : undefined,
  });
  return info;
})();

const devFormat = combine(
  attachRequestContext,
  captureToBuffer,
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}${stackStr}`;
  })
);

const prodFormat = combine(
  attachRequestContext,
  captureToBuffer,
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
  exitOnError: false,
});
