import { Request, Response, NextFunction } from 'express';
import { getRequestContext } from './requestContext';
import { MetricsSnapshotModel } from '../lib/metrics-snapshot.model';
import { SlowRequestModel } from '../lib/slow-request.model';
import { logger } from '../lib/logger';

// In-process request/error counters for the Ops Center infrastructure view.
// Single-process gauge only — not shared across instances — acceptable for
// the current single-dyno deployment. Resets on process restart. Per-minute
// rollups are additionally flushed to Mongo (see flushSnapshot below) so
// historical trend charts survive a restart even though the live buckets
// don't.

const WINDOW_MS = 60_000;
const BUCKET_MS = 1_000;
const BUCKET_COUNT = WINDOW_MS / BUCKET_MS;
const SLOW_REQUEST_MS = 500;
const LATENCY_SAMPLE_CAP = 500;

interface Bucket {
  timestamp: number;
  requests: number;
  errors: number;
  durationTotalMs: number;
}

const buckets: Bucket[] = [];
// Bounded reservoir of recent durations for approximate P95/P99 — not exact
// percentiles, but good enough for an Ops Center dashboard and far cheaper
// than storing every sample forever.
const latencySamples: number[] = [];

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

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
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
  statusCodes: Record<number, number>;
  latencySamples: number[];
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

    latencySamples.push(duration);
    if (latencySamples.length > LATENCY_SAMPLE_CAP) latencySamples.shift();

    const stats = featureStats.get(feature) ?? {
      requests: 0, errors: 0, durationTotalMs: 0, lastSeenAt: 0,
      statusCodes: {}, latencySamples: [],
    };
    stats.requests += 1;
    stats.durationTotalMs += duration;
    if (isError) stats.errors += 1;
    stats.lastSeenAt = Date.now();
    stats.statusCodes[res.statusCode] = (stats.statusCodes[res.statusCode] ?? 0) + 1;
    stats.latencySamples.push(duration);
    if (stats.latencySamples.length > LATENCY_SAMPLE_CAP) stats.latencySamples.shift();
    featureStats.set(feature, stats);

    if (duration > SLOW_REQUEST_MS) {
      const ctx = getRequestContext();
      SlowRequestModel.create({
        requestId: ctx?.requestId,
        correlationId: ctx?.correlationId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        userId: req.user?.userId,
        role: req.user?.role,
        schoolId: req.user?.schoolId,
        memoryMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
      }).catch((err: Error) => logger.error('Failed to persist slow request', { message: err.message }));
    }
  });

  next();
};

export interface FeatureHealth {
  feature: string;
  requests: number;
  errors: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  statusCodes: Record<number, number>;
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
      p95ResponseTimeMs: percentile(stats.latencySamples, 95),
      p99ResponseTimeMs: percentile(stats.latencySamples, 99),
      statusCodes: stats.statusCodes,
      lastSeenAt: new Date(stats.lastSeenAt).toISOString(),
    }))
    .sort((a, b) => b.requests - a.requests);
}

export interface MetricsSnapshot {
  requestsPerMinute: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
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
    p95ResponseTimeMs: percentile(latencySamples, 95),
    p99ResponseTimeMs: percentile(latencySamples, 99),
  };
}

let lastFlushedMinute = 0;

async function flushSnapshot(): Promise<void> {
  const now = Date.now();
  const minuteStart = now - (now % 60_000);
  if (minuteStart === lastFlushedMinute) return;
  lastFlushedMinute = minuteStart;

  const snapshot = getMetricsSnapshot();
  if (snapshot.requestsPerMinute === 0) return;

  try {
    await MetricsSnapshotModel.create({
      minuteStart: new Date(minuteStart),
      requests: snapshot.requestsPerMinute,
      errorCount: Math.round((snapshot.errorRatePercent / 100) * snapshot.requestsPerMinute),
      avgResponseTimeMs: snapshot.avgResponseTimeMs,
      p95ResponseTimeMs: snapshot.p95ResponseTimeMs,
      p99ResponseTimeMs: snapshot.p99ResponseTimeMs,
      instance: process.env.RENDER_INSTANCE_ID || 'local',
    });
  } catch (err) {
    logger.error('Failed to persist metrics snapshot', { message: (err as Error).message });
  }
}

// Started once per process from server.ts — see startMetricsSnapshotJob.
export function startMetricsSnapshotJob(): NodeJS.Timeout {
  return setInterval(() => { void flushSnapshot(); }, 60_000);
}
