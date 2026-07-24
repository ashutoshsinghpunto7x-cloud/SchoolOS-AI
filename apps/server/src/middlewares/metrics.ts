import { Request, Response, NextFunction } from 'express';

// In-process request/error counters for the Ops Center infrastructure view.
// Single-process gauge only — not shared across instances — acceptable for
// the current single-dyno deployment. Resets on process restart.

const WINDOW_MS = 60_000;
const BUCKET_MS = 1_000;
const BUCKET_COUNT = WINDOW_MS / BUCKET_MS;

interface Bucket {
  timestamp: number;
  requests: number;
  errors: number;
  durationTotalMs: number;
}

const buckets: Bucket[] = [];

function currentBucket(): Bucket {
  const now = Date.now();
  const bucketStart = now - (now % BUCKET_MS);
  const last = buckets[buckets.length - 1];
  if (last && last.timestamp === bucketStart) return last;

  const fresh: Bucket = { timestamp: bucketStart, requests: 0, errors: 0, durationTotalMs: 0 };
  buckets.push(fresh);
  while (buckets.length > BUCKET_COUNT) buckets.shift();
  return fresh;
}

// Per-feature counters (Application Health screen) — cumulative since process
// start, not a rolling window like the global buckets above. Keyed by the
// first path segment after /api/v1/, which matches how routes/index.ts
// mounts each feature router (e.g. /api/v1/attendance/mark -> "attendance").
interface FeatureStats {
  requests: number;
  errors: number;
  durationTotalMs: number;
  lastSeenAt: number;
}

const featureStats = new Map<string, FeatureStats>();

function featureKeyFor(originalUrl: string): string {
  const match = originalUrl.match(/^\/api\/v1\/([^/?]+)/);
  return match ? match[1] : 'other';
}

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const feature = featureKeyFor(req.originalUrl);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;

    const bucket = currentBucket();
    bucket.requests += 1;
    bucket.durationTotalMs += duration;
    if (isError) bucket.errors += 1;

    const stats = featureStats.get(feature) ?? { requests: 0, errors: 0, durationTotalMs: 0, lastSeenAt: 0 };
    stats.requests += 1;
    stats.durationTotalMs += duration;
    if (isError) stats.errors += 1;
    stats.lastSeenAt = Date.now();
    featureStats.set(feature, stats);
  });

  next();
};

export interface FeatureHealth {
  feature: string;
  requests: number;
  errors: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
  lastSeenAt: string;
}

export function getFeatureHealth(): FeatureHealth[] {
  return Array.from(featureStats.entries())
    .map(([feature, stats]) => ({
      feature,
      requests: stats.requests,
      errors: stats.errors,
      errorRatePercent: stats.requests > 0 ? Number(((stats.errors / stats.requests) * 100).toFixed(2)) : 0,
      avgResponseTimeMs: stats.requests > 0 ? Math.round(stats.durationTotalMs / stats.requests) : 0,
      lastSeenAt: new Date(stats.lastSeenAt).toISOString(),
    }))
    .sort((a, b) => b.requests - a.requests);
}

export interface MetricsSnapshot {
  requestsPerMinute: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const cutoff = Date.now() - WINDOW_MS;
  const recent = buckets.filter((b) => b.timestamp >= cutoff);

  const requests = recent.reduce((sum, b) => sum + b.requests, 0);
  const errors = recent.reduce((sum, b) => sum + b.errors, 0);
  const durationTotalMs = recent.reduce((sum, b) => sum + b.durationTotalMs, 0);

  return {
    requestsPerMinute: requests,
    errorRatePercent: requests > 0 ? Number(((errors / requests) * 100).toFixed(2)) : 0,
    avgResponseTimeMs: requests > 0 ? Math.round(durationTotalMs / requests) : 0,
  };
}
