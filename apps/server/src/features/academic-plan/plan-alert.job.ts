import cron from 'node-cron';
import { logger } from '../../lib/logger';
import { withLeaderLock } from '../../lib/redis-lock';
import { runPlanAlertDetection } from './plan-alert.service';

// node-cron has no cross-instance coordination — same reasoning as
// planner-notifications.job.ts's lock: without it a multi-instance deploy
// would run detection (and send digest notifications) once per instance.
const LEADER_LOCK_KEY = 'locks:plan-alert-detection';
const LEADER_LOCK_TTL_SECONDS = 900; // a full cross-school scan comfortably fits in 15 minutes at current scale

/** Nightly, 01:30 server time — after the day's plan-day status updates have
 *  settled and well before staff log in. Registered once at process start
 *  (server.ts only). */
export function startPlanAlertScheduler(): void {
  cron.schedule('30 1 * * *', () => {
    withLeaderLock(LEADER_LOCK_KEY, LEADER_LOCK_TTL_SECONDS, async () => {
      const result = await runPlanAlertDetection();
      logger.info('[PlanAlerts] Nightly detection run complete', result);
    }).catch((err) => logger.error('[PlanAlerts] Scheduled run failed', { err }));
  });
  logger.info('[PlanAlerts] Scheduler registered (nightly 01:30)');
}
