import { redis } from './redis';
import { logger } from './logger';

// ISO-8601 date strings (what JSON.stringify turns Date fields into) get
// revived back into Date objects on the way out of Redis, so callers that
// compare e.g. maintenance.scheduledStartAt against `new Date()` keep working
// the same as when these caches held live objects in a process-local Map.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value;
}

/**
 * Factory behind the app's short-TTL read caches (feature flags, maintenance
 * mode, module restrictions). Backed by Redis when REDIS_URL is configured,
 * so multiple server instances see the same state and `invalidate()` from
 * one instance is visible to all of them immediately instead of only after
 * the next TTL expiry on each. Falls back to a process-local Map — the
 * original behavior of these caches — when Redis isn't configured or a call
 * to it fails, so a Redis outage degrades to "slightly stale, per-instance"
 * rather than taking the caches down.
 */
export function createTtlCache<T>(namespace: string, ttlMs: number) {
  const local = new Map<string, { data: T; expiresAt: number }>();

  function redisKey(key: string): string {
    return `${namespace}:${key}`;
  }

  function getLocal(key: string): T | undefined {
    const entry = local.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      local.delete(key);
      return undefined;
    }
    return entry.data;
  }

  return {
    async get(key: string): Promise<T | undefined> {
      if (redis) {
        try {
          const raw = await redis.get(redisKey(key));
          if (raw !== null) return JSON.parse(raw, reviveDates) as T;
          return undefined;
        } catch (err) {
          logger.warn(`redis-ttl-cache(${namespace}): get failed, using local fallback`, { error: (err as Error).message });
        }
      }
      return getLocal(key);
    },

    async set(key: string, data: T): Promise<void> {
      local.set(key, { data, expiresAt: Date.now() + ttlMs });
      if (redis) {
        try {
          await redis.set(redisKey(key), JSON.stringify(data), 'PX', ttlMs);
        } catch (err) {
          logger.warn(`redis-ttl-cache(${namespace}): set failed, local fallback still updated`, { error: (err as Error).message });
        }
      }
    },

    /** Clears everything in this namespace. Cheap enough given the expected key counts (hundreds, not millions). */
    async invalidate(): Promise<void> {
      local.clear();
      if (redis) {
        try {
          const keys = await redis.keys(`${namespace}:*`);
          if (keys.length) await redis.del(...keys);
        } catch (err) {
          logger.warn(`redis-ttl-cache(${namespace}): invalidate failed on Redis`, { error: (err as Error).message });
        }
      }
    },
  };
}

