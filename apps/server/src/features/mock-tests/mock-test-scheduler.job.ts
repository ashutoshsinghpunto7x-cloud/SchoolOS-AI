import cron from 'node-cron';
import { logger } from '../../lib/logger';
import { withLeaderLock } from '../../lib/redis-lock';
import { mockTestRepository } from './mock-test.repository';
import { mockTestService } from './mock-test.service';
import { sendTestLinkWhatsApp } from '../communication/mock-test-whatsapp.stub';

/** Flips every approved test whose scheduledStart has arrived to 'live', and fans out the
 *  (stubbed) WhatsApp test-link send to every parent in that class. Exported standalone for
 *  manual/verification runs, same convention as runPlannerReminders. */
export async function runOpenMockTestsTick(): Promise<{ opened: number }> {
  const now = new Date();
  const toOpen = await mockTestRepository.findApprovedReadyToGoLive(now);
  let opened = 0;

  for (const test of toOpen) {
    const testId = String(test._id);
    try {
      const live = await mockTestRepository.markLive(testId);
      if (!live) continue; // lost a race with another instance/tick — skip, don't double-notify

      const students = await mockTestService.findStudentsForClass(test.schoolId, test.class);
      sendTestLinkWhatsApp(testId, test.title, students.map((s) => ({ studentName: s.fullName, parentPhone: s.parentPhone })));
      opened += 1;
    } catch (err) {
      logger.error('[MockTestScheduler] Failed to open mock test', { testId, err });
    }
  }

  if (opened > 0) logger.info('[MockTestScheduler] Opened mock test(s)', { opened });
  return { opened };
}

/** Flips every live test whose scheduledEnd has arrived to 'closed' — no further submissions accepted after this. */
export async function runCloseMockTestsTick(): Promise<{ closed: number }> {
  const now = new Date();
  const toClose = await mockTestRepository.findLiveReadyToClose(now);
  let closed = 0;

  for (const test of toClose) {
    const testId = String(test._id);
    try {
      const result = await mockTestRepository.markClosed(testId);
      if (result) closed += 1;
    } catch (err) {
      logger.error('[MockTestScheduler] Failed to close mock test', { testId, err });
    }
  }

  if (closed > 0) logger.info('[MockTestScheduler] Closed mock test(s)', { closed });
  return { closed };
}

// Runs every minute — mock test windows are minute-granular (scheduled start/end times), unlike
// the once-a-day planner reminders, so this needs a much tighter tick.
const OPEN_LOCK_KEY = 'locks:mock-tests-open';
const CLOSE_LOCK_KEY = 'locks:mock-tests-close';
const LOCK_TTL_SECONDS = 50;

/** Registered once at process start (server.ts only), same convention as startPlannerScheduler. */
export function startMockTestScheduler(): void {
  cron.schedule('* * * * *', () => {
    withLeaderLock(OPEN_LOCK_KEY, LOCK_TTL_SECONDS, async () => {
      await runOpenMockTestsTick();
    }).catch((err) => logger.error('[MockTestScheduler] Open tick failed', { err }));

    withLeaderLock(CLOSE_LOCK_KEY, LOCK_TTL_SECONDS, async () => {
      await runCloseMockTestsTick();
    }).catch((err) => logger.error('[MockTestScheduler] Close tick failed', { err }));
  });
  logger.info('[MockTestScheduler] Scheduler registered (every minute)');
}
