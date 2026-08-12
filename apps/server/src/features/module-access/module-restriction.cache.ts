// Same short-TTL process-local cache shape as maintenance.cache.ts — this is
// read on every authenticated page navigation across every open tab, so it
// needs to be cheap; invalidate() after every write keeps staleness to one
// TTL window at worst.

import { IModuleRestriction } from './module-restriction.model';

interface CacheEntry {
  data: IModuleRestriction[];
  expiresAt: number;
}

const TTL_MS = 5_000;

let entry: CacheEntry | null = null;

export const moduleRestrictionCache = {
  get(): IModuleRestriction[] | undefined {
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      entry = null;
      return undefined;
    }
    return entry.data;
  },

  set(data: IModuleRestriction[]): void {
    entry = { data, expiresAt: Date.now() + TTL_MS };
  },

  invalidate(): void {
    entry = null;
  },
};
