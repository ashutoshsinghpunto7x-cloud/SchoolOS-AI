// Redis-backed when REDIS_URL is set (shared across server instances), with
// a process-local fallback otherwise — see lib/redis-ttl-cache.ts.
// `invalidate()` is called from the service after every write so admin
// changes (including Emergency Rollback) take effect on the very next read,
// on every instance.

import { createTtlCache } from '../../lib/redis-ttl-cache';

const TTL_MS = 30_000;

const cache = createTtlCache<unknown>('feature-flags', TTL_MS);

export const featureFlagCache = {
  async get<T>(key: string): Promise<T | undefined> {
    return cache.get(key) as Promise<T | undefined>;
  },

  async set<T>(key: string, data: T): Promise<void> {
    await cache.set(key, data);
  },

  async invalidate(): Promise<void> {
    await cache.invalidate();
  },
};
