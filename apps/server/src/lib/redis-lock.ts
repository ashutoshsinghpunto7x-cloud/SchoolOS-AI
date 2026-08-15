import { redis } from './redis';
import { logger } from './logger';

/**
 * Best-effort distributed lock for "exactly one server instance should run
 * this scheduled tick" work — e.g. the planner-reminders cron, which
 * node-cron fires independently on every instance since it has no built-in
 * cross-instance coordination. Falls back to "always run" when Redis isn't
 * configured, which is correct for today's single-instance deploy and
 * matches the behavior before this lock existed.
 *
 * Not a general-purpose mutex: it's fire-and-forget (skips `fn` outright if
 * the lock can't be acquired, no waiting/retry) and fails open on Redis
 * errors — a flaky Redis should never be the reason a scheduled job stops
 * running entirely.
 */
export async function withLeaderLock(key: string, ttlSeconds: number, fn: () => Promise<void>): Promise<void> {
  if (!redis) {
    await fn();
    return;
  }

  let acquired = true;
  try {
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    acquired = result === 'OK';
  } catch (err) {
    logger.warn(`[redis-lock] failed to acquire "${key}", running anyway`, { error: (err as Error).message });
  }

  if (!acquired) {
    logger.info(`[redis-lock] "${key}" already held by another instance, skipping this tick`);
    return;
  }

  await fn();
}
