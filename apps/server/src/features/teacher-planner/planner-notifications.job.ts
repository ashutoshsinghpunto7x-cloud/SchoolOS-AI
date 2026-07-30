import cron from 'node-cron';
import { logger } from '../../lib/logger';
import { AuthContext } from '../../lib/auth-context';
import { notificationService } from '../notifications/notification.service';
import { plannerRepository } from './planner.repository';

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// Cron jobs have no requesting user, so notifications are sent under a
// synthetic system actor — same "userId: 'system'" convention already used
// for background-originated audit log entries (see automation.service.ts).
function systemContext(schoolId: string): AuthContext {
  return { userId: 'system', schoolId, displayName: 'SchoolOS AI Planner', role: 'system' };
}

/** For every active TeacherPlanner, notifies the teacher (in-app + best-effort push)
 *  if they have pending tasks due today. Exported standalone so it can also be
 *  triggered manually (e.g. for verification) without waiting for the schedule. */
export async function runPlannerReminders(): Promise<{ notified: number }> {
  const now = new Date();
  const planners = await plannerRepository.findAllActive(now);
  let notified = 0;

  for (const planner of planners) {
    const dueToday = planner.weeks
      .flatMap((w) => w.tasks)
      .filter((t) => t.status === 'pending' && isSameDay(t.dueDate, now));
    if (dueToday.length === 0) continue;

    const titles = dueToday.slice(0, 3).map((t) => t.title).join(', ');
    try {
      await notificationService.sendToUser(
        {
          recipientUserId: planner.teacherId,
          type: 'planner_reminder',
          title: `${dueToday.length} planner task${dueToday.length > 1 ? 's' : ''} due today`,
          body: dueToday.length > 3 ? `${titles}…` : titles,
          payload: { plannerId: String(planner._id), class: planner.class, subject: planner.subject },
          priority: 'normal',
        },
        systemContext(planner.schoolId),
      );
      notified += 1;
    } catch (err) {
      logger.error('[PlannerNotifications] Failed to notify teacher', { plannerId: String(planner._id), err });
    }
  }

  logger.info('[PlannerNotifications] Daily reminder run complete', { plannersChecked: planners.length, notified });
  return { notified };
}

/** Weekday mornings, 07:00 server time — registered once at process start
 *  (server.ts only, not app.ts, so a serverless import never owns a timer). */
export function startPlannerScheduler(): void {
  cron.schedule('0 7 * * 1-5', () => {
    runPlannerReminders().catch((err) => logger.error('[PlannerNotifications] Scheduled run failed', { err }));
  });
  logger.info('[PlannerNotifications] Scheduler registered (weekdays 07:00)');
}
