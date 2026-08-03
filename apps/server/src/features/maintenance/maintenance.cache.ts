// Same minimal process-local TTL cache shape as feature-flag.cache.ts — kept
// deliberately short (5s) since this is read on every login attempt and every
// ProtectedRoute mount across every open tab; invalidate() runs after every
// write so a toggle/schedule change is visible within one TTL window at worst.

import { IMaintenanceState } from './maintenance.model';

interface CacheEntry {
  data: IMaintenanceState | null;
  expiresAt: number;
}

const TTL_MS = 5_000;

let entry: CacheEntry | null = null;

export const maintenanceCache = {
  get(): IMaintenanceState | null | undefined {
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      entry = null;
      return undefined;
    }
    return entry.data;
  },

  set(data: IMaintenanceState | null): void {
    entry = { data, expiresAt: Date.now() + TTL_MS };
  },

  invalidate(): void {
    entry = null;
  },
};
