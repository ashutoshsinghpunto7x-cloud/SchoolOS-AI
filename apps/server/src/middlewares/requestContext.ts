import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

// Threads a per-request id + a caller-supplied correlation id (so a single
// user action that fans out into multiple API calls, e.g. a bulk import,
// can be grouped in the Ops Center) through every log line and error record
// without passing `req` down every call stack. AsyncLocalStorage keeps this
// safe across concurrent requests on the same process.

export interface RequestContext {
  requestId: string;
  correlationId: string;
  startedAt: number;
  schoolId?: string;
  userId?: string;
  role?: string;
  ip?: string;
  device: DeviceInfo;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  device: 'mobile' | 'tablet' | 'desktop' | 'unknown';
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

// Deliberately not a dependency (ua-parser-js etc.) — Ops Center only needs a
// coarse browser/os/device bucket for the error dashboard, not exact versions.
export function parseUserAgent(uaHeader: string | undefined): DeviceInfo {
  const ua = uaHeader ?? '';
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';

  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let device: DeviceInfo['device'] = 'unknown';
  if (/ipad|tablet/i.test(ua)) device = 'tablet';
  else if (/mobi|iphone|android/i.test(ua)) device = 'mobile';
  else if (ua) device = 'desktop';

  return { browser, os, device };
}

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = randomUUID();
  const correlationId = (req.headers['x-correlation-id'] as string | undefined)?.trim() || randomUUID();

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', correlationId);

  const context: RequestContext = {
    requestId,
    correlationId,
    startedAt: Date.now(),
    ip: req.ip,
    device: parseUserAgent(req.headers['user-agent'] as string | undefined),
  };

  storage.run(context, () => next());
};

// req.user is populated by the auth middleware, which runs after this one —
// call this from auth middleware once the JWT is verified so later log lines
// and error records in the same request carry the user/school/role too.
export function attachRequestUser(user: { userId?: string; schoolId?: string; role?: string }): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.userId = user.userId;
  ctx.schoolId = user.schoolId;
  ctx.role = user.role;
}
