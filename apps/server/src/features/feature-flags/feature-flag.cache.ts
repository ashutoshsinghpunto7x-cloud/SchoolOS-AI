// First cache in this codebase — kept deliberately minimal (no Redis/node-cache
// dependency exists elsewhere here). A single process-local Map with a short
// TTL is enough to keep flag evaluation off Mongo on every request, and
// `invalidate()` is called from the service after every write so admin
// changes (including Emergency Rollback) take effect on the very next read.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TTL_MS = 30_000;

const store = new Map<string, CacheEntry<unknown>>();

export const featureFlagCache = {
  get<T>(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry.data as T;
  },

  set<T>(key: string, data: T): void {
    store.set(key, { data, expiresAt: Date.now() + TTL_MS });
  },

  /** Clears everything — cheap enough given the expected feature count (hundreds, not millions). */
  invalidate(): void {
    store.clear();
  },
};
