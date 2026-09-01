import cron from 'node-cron';
import { logger } from '../../lib/logger';
import { withLeaderLock } from '../../lib/redis-lock';
import { AuthContext } from '../../lib/auth-context';
import { notificationService } from '../notifications/notification.service';
import { followUpRepository } from './follow-up.repository';
import { enquiryRepository } from '../enquiries/enquiry.repository';

// Reception Management Module SRD, Module 4 — "Missed follow-up alerts:
// anything past due and not marked done shows in red, escalates to principal
// if 2+ days overdue." Two passes: flip anything overdue to `missed`, then
// escalate anything that's been `missed` for 2+ days and hasn't already
// triggered a notification (see `escalatedAt` on the model).

const ESCALATION_DAYS = 2;

function systemContext(schoolId: string): AuthContext {
  return { userId: 'system', schoolId, displayName: 'SchoolOS AI Reception', role: 'system' };
}

export async function runMissedFollowUpCheck(): Promise<{ markedMissed: number; escalated: number }> {
  const overduePending = await followUpRepository.findOverduePending();
  let markedMissed = 0;
  for (const fu of overduePending) {
    await followUpRepository.setStatus(fu._id.toString(), fu.schoolId, { status: 'missed' });
    markedMissed += 1;
  }

  const cutoff = new Date(Date.now() - ESCALATION_DAYS * 24 * 60 * 60 * 1000);
  const staleMissed = await followUpRepository.findUnescalatedStaleMissed(cutoff);
  let escalated = 0;
  for (const fu of staleMissed) {
    try {
      const enquiry = await enquiryRepository.findById(fu.enquiryId, fu.schoolId);
      await notificationService.sendToApprovers({
        type: 'message',
        title: 'Follow-up overdue 2+ days',
        body: enquiry
          ? `Follow-up for ${enquiry.studentName} (${enquiry.parentName}) is ${ESCALATION_DAYS}+ days overdue.`
          : `A follow-up is ${ESCALATION_DAYS}+ days overdue.`,
        payload: { enquiryId: fu.enquiryId, followUpId: String(fu._id) },
      }, systemContext(fu.schoolId));
      await followUpRepository.setStatus(fu._id.toString(), fu.schoolId, { status: 'missed', escalatedAt: new Date() });
      escalated += 1;
    } catch (err) {
      logger.error('[FollowUpAuto] Failed to escalate stale missed follow-up', { followUpId: String(fu._id), err });
    }
  }

  if (markedMissed > 0 || escalated > 0) {
    logger.info('[FollowUpAuto] Missed follow-up check complete', { markedMissed, escalated });
  }
  return { markedMissed, escalated };
}

const LEADER_LOCK_KEY = 'locks:follow-up-missed-check';
const LEADER_LOCK_TTL_SECONDS = 600;

/** Hourly — registered once at process start (server.ts only). */
export function startFollowUpAutoScheduler(): void {
  cron.schedule('0 * * * *', () => {
    withLeaderLock(LEADER_LOCK_KEY, LEADER_LOCK_TTL_SECONDS, async () => {
      await runMissedFollowUpCheck();
    }).catch((err) => logger.error('[FollowUpAuto] Scheduled run failed', { err }));
  });
  logger.info('[FollowUpAuto] Scheduler registered (hourly)');
}
