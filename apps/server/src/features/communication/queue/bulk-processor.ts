import { bulkSendJobRepository } from '../bulk-send-job.repository';
import { bulkSendJobItemRepository } from '../bulk-send-job-item.repository';
import { IBulkSendJob } from '../bulk-send-job.model';
import { IBulkSendJobItem } from '../bulk-send-job-item.model';
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
  /** Day/class/section this run is scoped to — see BulkSendJob#contextDate and findActiveForContext. */
  contextDate?: string;
  contextClass?: string;
  contextSection?: string;
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

// A PROCESSING job whose counters haven't moved in this long is presumed
// orphaned by a crash/restart, not actively being worked — see
// resumeStuckBulkJobs. Comfortably longer than any single sendOne() call
// should ever take, so a merely-slow (not dead) run is never double-picked-up.
const STALE_JOB_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Creates a BulkSendJob, persists every recipient as a BulkSendJobItem
 * (status PENDING), and starts working through them in the background — the
 * caller gets the job id back immediately and can poll
 * GET /communication/jobs/:id for progress.
 *
 * No dedicated queue (Redis/BullMQ): progress and the recipient list both
 * live in Mongo, and the worker loop lives in this Node process. Persisting
 * recipients (rather than keeping them only in memory, as before) is what
 * lets resumeStuckBulkJobs() pick a job back up after a restart instead of
 * leaving it stranded at whatever counters it reached.
 */
export async function enqueueBulkSend(input: EnqueueBulkSendInput): Promise<BulkSendHandle> {
  const job = await bulkSendJobRepository.create({
    schoolId: input.schoolId,
    notificationType: input.notificationType,
    channel: input.channel ?? 'whatsapp',
    totalRecipients: input.recipients.length,
    createdBy: input.createdBy,
    createdByUserId: input.createdByUserId,
    overrideBody: input.overrideBody,
    ip: input.ip,
    contextDate: input.contextDate,
    contextClass: input.contextClass,
    contextSection: input.contextSection,
  });

  const jobId = job._id.toString();
  await bulkSendJobItemRepository.insertMany(jobId, input.schoolId, input.recipients);

  runWorkerPool(job).catch((err) => {
    logger.error('[BulkProcessor] Unhandled error running bulk send job', { jobId, err });
  });

  return { jobId, totalRecipients: input.recipients.length };
}

/**
 * Finds jobs an earlier instance left mid-run (see STALE_JOB_THRESHOLD_MS),
 * reclaims any items that instance had claimed but never finished, and
 * restarts the worker pool for each. Call once at process startup (see
 * server.ts) — cheap no-op when nothing is stuck.
 */
export async function resumeStuckBulkJobs(): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_JOB_THRESHOLD_MS);
  const stuckJobs = await bulkSendJobRepository.findStaleProcessing(staleBefore);

  for (const job of stuckJobs) {
    const jobId = job._id.toString();
    const reclaimed = await bulkSendJobItemRepository.reclaimStale(jobId, staleBefore);
    logger.warn('[BulkProcessor] Resuming bulk send job left over from a previous instance/restart', {
      jobId,
      reclaimedItems: reclaimed,
    });
    runWorkerPool(job).catch((err) => {
      logger.error('[BulkProcessor] Unhandled error resuming bulk send job', { jobId, err });
    });
  }
}

async function runWorkerPool(job: IBulkSendJob): Promise<void> {
  const jobId = job._id.toString();

  async function worker(): Promise<void> {
    let item: IBulkSendJobItem | null;
    while ((item = await bulkSendJobItemRepository.claimNext(jobId)) !== null) {
      await processItem(job, item);
    }
  }

  await Promise.all(Array.from({ length: PROCESSOR_CONCURRENCY }, worker));

  // Guards against a razor-thin race where two instances both resumed this
  // job: whichever finishes its own worker pool first checks that no items
  // are left (PENDING or still claimed by the other instance) before
  // completing it, so the job isn't marked done while work remains.
  if (await bulkSendJobItemRepository.hasIncomplete(jobId)) return;

  await bulkSendJobRepository.markCompleted(jobId);

  auditService.log({
    userId: job.createdByUserId,
    userDisplayName: job.createdBy,
    action: 'notification.bulk_job_completed',
    resource: 'notification_log',
    resourceId: jobId,
    details: { notificationType: job.notificationType, totalRecipients: job.totalRecipients },
    ip: job.ip,
    schoolId: job.schoolId,
  });
}

async function processItem(job: IBulkSendJob, item: IBulkSendJobItem): Promise<void> {
  const jobId = job._id.toString();
  const itemId = item._id.toString();

  try {
    const log = await sendOne({
      schoolId: job.schoolId,
      notificationType: job.notificationType,
      channel: job.channel,
      recipient: item.recipient,
      createdBy: job.createdBy,
      bulkJobId: jobId,
      overrideBody: job.overrideBody,
    });

    if (log.status === 'SENT' || log.status === 'DELIVERED' || log.status === 'READ') {
      await bulkSendJobItemRepository.markResult(itemId, 'SENT');
      await bulkSendJobRepository.incrementCounters(jobId, { sent: 1 });
    } else if (log.status === 'FAILED') {
      await bulkSendJobItemRepository.markResult(itemId, 'FAILED');
      await bulkSendJobRepository.incrementCounters(jobId, { failed: 1 });
    } else {
      await bulkSendJobItemRepository.markResult(itemId, 'SKIPPED');
      await bulkSendJobRepository.incrementCounters(jobId, { skipped: 1 });
    }
  } catch (err) {
    await bulkSendJobItemRepository.markResult(itemId, 'FAILED', (err as Error).message);
    await bulkSendJobRepository.incrementCounters(jobId, { failed: 1 });
    logger.error('[BulkProcessor] Recipient send threw unexpectedly', { jobId, itemId, err });
  }
}
