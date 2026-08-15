import { redis } from './redis';
import { logger } from './logger';

// Fleet-wide counterpart to the in-process buckets in middlewares/metrics.ts.
// Every instance writes its own request/error/latency numbers into shared
// Redis keys here (fire-and-forget, best-effort); whichever instance serves
// an Ops Center dashboard request then reads the *merged* totals instead of
// just its own. Only active when REDIS_URL is configured — metrics.ts falls
// back to its local-only numbers otherwise, same as before this existed.

const GLOBAL_WINDOW_SECONDS = 60;
const BUCKET_TTL_SECONDS = 90;
const LATENCY_SAMPLE_CAP = 500;

const GLOBAL_LATENCY_KEY = 'metrics:global:latency';
const FEATURE_SET_KEY = 'metrics:features';

function globalBucketKey(tsSec: number): string {
  return `metrics:global:bucket:${tsSec}`;
}
function featureKey(feature: string): string {
  return `metrics:feature:${feature}`;
}
function featureStatusKey(feature: string): string {
  return `metrics:feature:${feature}:status`;
}
function featureLatencyKey(feature: string): string {
  return `metrics:feature:${feature}:latency`;
}

export function sharedMetricsEnabled(): boolean {
  return redis !== null;
}

/** Called once per finished request from metricsMiddleware. No-op (and cheap
 *  to check) when Redis isn't configured. */
export async function recordRequest(feature: string, durationMs: number, statusCode: number): Promise<void> {
  if (!redis) return;
  const isError = statusCode >= 400;
  const tsSec = Math.floor(Date.now() / 1000);

  try {
    const bucketKey = globalBucketKey(tsSec);
    const fKey = featureKey(feature);
    const fLatencyKey = featureLatencyKey(feature);

    const pipeline = redis.pipeline();
    pipeline.hincrby(bucketKey, 'requests', 1);
    pipeline.hincrby(bucketKey, 'durationTotalMs', durationMs);
    if (isError) pipeline.hincrby(bucketKey, 'errors', 1);
    pipeline.expire(bucketKey, BUCKET_TTL_SECONDS);

    pipeline.lpush(GLOBAL_LATENCY_KEY, String(durationMs));
    pipeline.ltrim(GLOBAL_LATENCY_KEY, 0, LATENCY_SAMPLE_CAP - 1);

    pipeline.sadd(FEATURE_SET_KEY, feature);
    pipeline.hincrby(fKey, 'requests', 1);
    pipeline.hincrby(fKey, 'durationTotalMs', durationMs);
    if (isError) pipeline.hincrby(fKey, 'errors', 1);
    pipeline.hset(fKey, 'lastSeenAt', String(Date.now()));

    pipeline.hincrby(featureStatusKey(feature), String(statusCode), 1);

    pipeline.lpush(fLatencyKey, String(durationMs));
    pipeline.ltrim(fLatencyKey, 0, LATENCY_SAMPLE_CAP - 1);

    await pipeline.exec();
  } catch (err) {
    logger.warn('[redis-metrics] recordRequest failed', { error: (err as Error).message });
  }
}

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export interface MetricsSnapshot {
  requestsPerMinute: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
}

/** Returns null (not a zeroed snapshot) when Redis isn't configured or a read
 *  fails, so callers can tell "no shared data" apart from "fleet is idle"
 *  and fall back to their local-only numbers. */
export async function getGlobalSnapshot(): Promise<MetricsSnapshot | null> {
  if (!redis) return null;

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const pipeline = redis.pipeline();
    for (let i = 0; i < GLOBAL_WINDOW_SECONDS; i++) {
      pipeline.hmget(globalBucketKey(nowSec - i), 'requests', 'errors', 'durationTotalMs');
    }
    pipeline.lrange(GLOBAL_LATENCY_KEY, 0, -1);

    const results = await pipeline.exec();
    if (!results) return null;

    let requests = 0;
    let errors = 0;
    let durationTotalMs = 0;
    for (let i = 0; i < GLOBAL_WINDOW_SECONDS; i++) {
      const [, value] = results[i];
      const [r, e, d] = (value as (string | null)[] | undefined) ?? [null, null, null];
      requests += Number(r ?? 0);
      errors += Number(e ?? 0);
      durationTotalMs += Number(d ?? 0);
    }

    const [, latencyRaw] = results[GLOBAL_WINDOW_SECONDS];
    const latencySamples = ((latencyRaw as string[] | undefined) ?? []).map(Number);

    return {
      requestsPerMinute: requests,
      errorRatePercent: requests > 0 ? Number(((errors / requests) * 100).toFixed(2)) : 0,
      avgResponseTimeMs: requests > 0 ? Math.round(durationTotalMs / requests) : 0,
      p95ResponseTimeMs: percentile(latencySamples, 95),
      p99ResponseTimeMs: percentile(latencySamples, 99),
    };
  } catch (err) {
    logger.warn('[redis-metrics] getGlobalSnapshot failed', { error: (err as Error).message });
    return null;
  }
}

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

/** Returns null under the same "no shared data available" rule as
 *  getGlobalSnapshot — callers fall back to local-only stats instead of
 *  showing an empty fleet-wide table. */
export async function getFeatureHealth(): Promise<FeatureHealth[] | null> {
  if (!redis) return null;

  try {
    const features = await redis.smembers(FEATURE_SET_KEY);
    if (features.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const feature of features) {
      pipeline.hgetall(featureKey(feature));
      pipeline.hgetall(featureStatusKey(feature));
      pipeline.lrange(featureLatencyKey(feature), 0, -1);
    }
    const results = await pipeline.exec();
    if (!results) return null;

    return features
      .map((feature, i) => {
        const [, statsRaw] = results[i * 3];
        const [, statusRaw] = results[i * 3 + 1];
        const [, latencyRaw] = results[i * 3 + 2];

        const stats = (statsRaw as Record<string, string> | undefined) ?? {};
        const statusCounts = (statusRaw as Record<string, string> | undefined) ?? {};
        const latencySamples = ((latencyRaw as string[] | undefined) ?? []).map(Number);

        const requests = Number(stats.requests ?? 0);
        const errors = Number(stats.errors ?? 0);
        const durationTotalMs = Number(stats.durationTotalMs ?? 0);
        const lastSeenAt = Number(stats.lastSeenAt ?? 0);

        const statusCodes: Record<number, number> = {};
        for (const [code, count] of Object.entries(statusCounts)) statusCodes[Number(code)] = Number(count);

        return {
          feature,
          requests,
          errors,
          errorRatePercent: requests > 0 ? Number(((errors / requests) * 100).toFixed(2)) : 0,
          avgResponseTimeMs: requests > 0 ? Math.round(durationTotalMs / requests) : 0,
          p95ResponseTimeMs: percentile(latencySamples, 95),
          p99ResponseTimeMs: percentile(latencySamples, 99),
          statusCodes,
          lastSeenAt: lastSeenAt > 0 ? new Date(lastSeenAt).toISOString() : new Date(0).toISOString(),
        };
      })
      .sort((a, b) => b.requests - a.requests);
  } catch (err) {
    logger.warn('[redis-metrics] getFeatureHealth failed', { error: (err as Error).message });
    return null;
  }
}
