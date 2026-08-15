// Redis-backed when REDIS_URL is set (shared across server instances), with
// a process-local fallback otherwise — see lib/redis-ttl-cache.ts. This is
// read on every authenticated page navigation across every open tab, so it
// needs to be cheap; invalidate() after every write keeps staleness to one
// TTL window at worst, on every instance.

import { IModuleRestriction } from './module-restriction.model';
import { createTtlCache } from '../../lib/redis-ttl-cache';

const TTL_MS = 5_000;
const SINGLETON_KEY = 'all';

const cache = createTtlCache<IModuleRestriction[]>('module-restrictions', TTL_MS);

export const moduleRestrictionCache = {
  async get(): Promise<IModuleRestriction[] | undefined> {
    return cache.get(SINGLETON_KEY);
  },

  async set(data: IModuleRestriction[]): Promise<void> {
    await cache.set(SINGLETON_KEY, data);
  },

  async invalidate(): Promise<void> {
    await cache.invalidate();
  },
};
