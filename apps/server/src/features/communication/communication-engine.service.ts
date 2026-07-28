import { sendOne, retryOne, SendOneInput } from './communication-core';
import { enqueueBulkSend, EnqueueBulkSendInput, BulkSendHandle } from './queue/bulk-processor';
import { notificationLogRepository } from './notification-log.repository';
import { INotificationLog } from './notification-log.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';

/**
 * The single entrypoint every business module (attendance, fees, admissions,
 * ...) uses to notify a parent — never call a channel provider directly.
 * Adding Email/SMS/Push/Voice for real later only changes providers/*, never
 * this file or its callers.
 */
export const communicationEngineService = {
  /** Send to exactly one recipient, synchronously. */
  send(input: SendOneInput): Promise<INotificationLog> {
    return sendOne(input);
  },

  /** Enqueue many recipients — returns immediately with a job id to poll. */
  sendBulk(input: EnqueueBulkSendInput): Promise<BulkSendHandle> {
    return enqueueBulkSend(input);
  },

  async retry(id: string, ctx: AuthContext): Promise<INotificationLog> {
    const log = await notificationLogRepository.findById(id, ctx.schoolId);
    if (!log) throw new NotFoundError('Notification log');
    if (log.status !== 'FAILED') throw new ValidationError('Only FAILED notifications can be retried');
    return retryOne(log);
  },
};
