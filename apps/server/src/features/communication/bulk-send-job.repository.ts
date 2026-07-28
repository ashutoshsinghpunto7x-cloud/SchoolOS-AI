import { BulkSendJob, IBulkSendJob } from './bulk-send-job.model';
import { NotificationChannel, NotificationType } from './notification-types';

export const bulkSendJobRepository = {
  async create(data: {
    schoolId: string;
    notificationType: NotificationType;
    channel: NotificationChannel;
    totalRecipients: number;
    createdBy: string;
  }): Promise<IBulkSendJob> {
    return BulkSendJob.create({ ...data, status: 'PROCESSING', startedAt: new Date() });
  },

  async findById(id: string, schoolId: string): Promise<IBulkSendJob | null> {
    return BulkSendJob.findOne({ _id: id, schoolId });
  },

  async incrementCounters(id: string, delta: { sent?: number; failed?: number; skipped?: number }): Promise<void> {
    const inc: Record<string, number> = {};
    if (delta.sent) inc.sent = delta.sent;
    if (delta.failed) inc.failed = delta.failed;
    if (delta.skipped) inc.skipped = delta.skipped;
    if (Object.keys(inc).length === 0) return;
    await BulkSendJob.updateOne({ _id: id }, { $inc: inc });
  },

  async markCompleted(id: string): Promise<void> {
    await BulkSendJob.updateOne({ _id: id }, { $set: { status: 'COMPLETED', completedAt: new Date() } });
  },

  async list(schoolId: string, limit = 50): Promise<IBulkSendJob[]> {
    return BulkSendJob.find({ schoolId }).sort({ createdAt: -1 }).limit(limit);
  },
};
