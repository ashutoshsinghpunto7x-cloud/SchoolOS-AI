import { bulkSendJobRepository } from '../bulk-send-job.repository';
import { sendOne, SendRecipientInput } from '../communication-core';
import { NotificationChannel, NotificationType } from '../notification-types';
import { logger } from '../../../lib/logger';
import { auditService } from '../../audit/audit.service';

export interface EnqueueBulkSendInput {
  schoolId: string;
  notificationType: NotificationType;
  channel?: NotificationChannel;
  recipients: SendRecipientInput[];
  createdBy: string;
  createdByUserId: string;
  ip?: string;
  /** Same-message-for-everyone override (broadcasts) — see SendOneInput#overrideBody. */
  overrideBody?: string;
}

export interface BulkSendHandle {
  jobId: string;
  totalRecipients: number;
}

// Concurrency for the in-process worker pool. This is intentionally modest —
// large enough to keep a 10,000-recipient run finishing in minutes without a
// dedicated job queue, small enough that it never competes meaningfully with
// the Express event loop serving other requests on the same process.
const PROCESSOR_CONCURRENCY = 8;

/**
 * Creates a BulkSendJob and starts working through `recipients` in the
 * background — the caller gets the job id back immediately and can poll
 * GET /communication/jobs/:id for progress. No Redis/BullMQ: this repo has no
 * queue infrastructure today, so progress lives in Mongo and the worker loop
 * lives in this Node process. If the process restarts mid-run, the job is
 * left at whatever counters it reached (status stays PROCESSING) — acceptable
 * for a school-scale bulk send, revisit with a durable queue if this ever
 * needs to survive restarts or scale across multiple server instances.
 */
export async function enqueueBulkSend(input: EnqueueBulkSendInput): Promise<BulkSendHandle> {
  const job = await bulkSendJobRepository.create({
    schoolId: input.schoolId,
    notificationType: input.notificationType,
    channel: input.channel ?? 'whatsapp',
    totalRecipients: input.recipients.length,
    createdBy: input.createdBy,
  });

  const jobId = job._id.toString();

  runInBackground(jobId, input).catch((err) => {
    logger.error('[BulkProcessor] Unhandled error running bulk send job', { jobId, err });
  });

  return { jobId, totalRecipients: input.recipients.length };
}

async function runInBackground(jobId: string, input: EnqueueBulkSendInput): Promise<void> {
  const { recipients } = input;
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < recipients.length) {
      const index = cursor++;
      const recipient = recipients[index];

      try {
        const log = await sendOne({
          schoolId: input.schoolId,
          notificationType: input.notificationType,
          channel: input.channel,
          recipient,
          createdBy: input.createdBy,
          bulkJobId: jobId,
          overrideBody: input.overrideBody,
        });

        if (log.status === 'SENT' || log.status === 'DELIVERED' || log.status === 'READ') {
          await bulkSendJobRepository.incrementCounters(jobId, { sent: 1 });
        } else if (log.status === 'FAILED') {
          await bulkSendJobRepository.incrementCounters(jobId, { failed: 1 });
        } else {
          await bulkSendJobRepository.incrementCounters(jobId, { skipped: 1 });
        }
      } catch (err) {
        await bulkSendJobRepository.incrementCounters(jobId, { failed: 1 });
        logger.error('[BulkProcessor] Recipient send threw unexpectedly', { jobId, err });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(PROCESSOR_CONCURRENCY, recipients.length) }, worker));

  await bulkSendJobRepository.markCompleted(jobId);

  auditService.log({
    userId: input.createdByUserId,
    userDisplayName: input.createdBy,
    action: 'notification.bulk_job_completed',
    resource: 'notification_log',
    resourceId: jobId,
    details: { notificationType: input.notificationType, totalRecipients: recipients.length },
    ip: input.ip,
    schoolId: input.schoolId,
  });
}
