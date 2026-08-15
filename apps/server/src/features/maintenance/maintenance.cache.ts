// Redis-backed when REDIS_URL is set (shared across server instances), with
// a process-local fallback otherwise — see lib/redis-ttl-cache.ts. Kept
// deliberately short (5s TTL) since this is read on every login attempt and
// every ProtectedRoute mount across every open tab; invalidate() runs after
// every write so a toggle/schedule change is visible within one TTL window
// at worst, on every instance.

import { IMaintenanceState } from './maintenance.model';
import { createTtlCache } from '../../lib/redis-ttl-cache';

const TTL_MS = 5_000;
const SINGLETON_KEY = 'state';

const cache = createTtlCache<IMaintenanceState | null>('maintenance', TTL_MS);

export const maintenanceCache = {
  async get(): Promise<IMaintenanceState | null | undefined> {
    return cache.get(SINGLETON_KEY);
  },

  async set(data: IMaintenanceState | null): Promise<void> {
    await cache.set(SINGLETON_KEY, data);
  },

  async invalidate(): Promise<void> {
    await cache.invalidate();
  },
};
