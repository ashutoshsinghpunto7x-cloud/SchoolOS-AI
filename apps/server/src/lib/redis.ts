import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

// Shared Redis client for state that needs to be consistent across server
// instances (feature flags, maintenance mode, module restrictions — see the
// *.cache.ts files that use it via lib/redis-ttl-cache.ts). REDIS_URL is
// optional: when unset (local dev, or a single-instance deploy), those
// caches fall back to a process-local Map instead, so nothing here is a hard
// requirement to run the app. It becomes one once more than one server
// instance is running, otherwise instances can disagree on flag/maintenance
// state for up to the cache TTL after a write.
let client: Redis | null = null;

if (env.REDIS_URL) {
  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    // Don't crash startup if Redis is briefly unreachable — the ttl-cache
    // fallback keeps requests served while ioredis keeps retrying.
    enableOfflineQueue: false,
  });

  client.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });
} else if (env.NODE_ENV === 'production') {
  logger.warn(
    'REDIS_URL is not set — feature flag / maintenance / module-restriction caches are process-local. ' +
      'Fine for a single instance; instances will disagree on state for up to the cache TTL if you scale to more than one.'
  );
}

export const redis = client;
