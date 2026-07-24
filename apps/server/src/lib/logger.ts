import winston from 'winston';
import { pushLog } from './log-buffer';

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const isDevelopment = process.env.NODE_ENV !== 'production';

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
