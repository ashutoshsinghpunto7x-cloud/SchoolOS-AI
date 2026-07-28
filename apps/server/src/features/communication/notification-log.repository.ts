import { NotificationLog, INotificationLog, NotificationStatus } from './notification-log.model';
import { NotificationChannel, NotificationType } from './notification-types';

export interface FindLogsOptions {
  page?: number;
  limit?: number;
  notificationType?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  search?: string;
  bulkJobId?: string;
}

export interface PaginatedLogs {
  logs: INotificationLog[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLogInput {
  schoolId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  recipientName?: string;
  studentId?: string;
  parentName?: string;
  phoneNumber?: string;
  status: NotificationStatus;
  sentAt?: Date;
  errorMessage?: string;
  payload: Record<string, unknown>;
  bulkJobId?: string;
  createdBy: string;
}

export const notificationLogRepository = {
  async create(data: CreateLogInput): Promise<INotificationLog> {
    return NotificationLog.create(data);
  },

  async findById(id: string, schoolId: string): Promise<INotificationLog | null> {
    return NotificationLog.findOne({ _id: id, schoolId });
  },

  async findByMetaMessageId(metaMessageId: string): Promise<INotificationLog | null> {
    return NotificationLog.findOne({ metaMessageId });
  },

  async findAll(schoolId: string, opts: FindLogsOptions = {}): Promise<PaginatedLogs> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId };
    if (opts.notificationType) query.notificationType = opts.notificationType;
    if (opts.channel) query.channel = opts.channel;
    if (opts.status) query.status = opts.status;
    if (opts.bulkJobId) query.bulkJobId = opts.bulkJobId;
    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ recipientName: regex }, { parentName: regex }, { phoneNumber: regex }];
    }

    const [logs, total] = await Promise.all([
      NotificationLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      NotificationLog.countDocuments(query),
    ]);

    return { logs, total, page, limit };
  },

  async findFailed(schoolId: string, limit = 100): Promise<INotificationLog[]> {
    return NotificationLog.find({ schoolId, status: 'FAILED' }).sort({ createdAt: -1 }).limit(limit);
  },

  async markSent(id: string, providerMessageId?: string): Promise<INotificationLog | null> {
    return NotificationLog.findByIdAndUpdate(
      id,
      { $set: { status: 'SENT', sentAt: new Date(), metaMessageId: providerMessageId } },
      { new: true },
    );
  },

  async markFailed(id: string, errorMessage: string): Promise<INotificationLog | null> {
    return NotificationLog.findByIdAndUpdate(
      id,
      { $set: { status: 'FAILED', errorMessage }, $inc: { retryCount: 1 } },
      { new: true },
    );
  },

  async updateDeliveryStatus(
    metaMessageId: string,
    status: Extract<NotificationStatus, 'DELIVERED' | 'READ' | 'FAILED'>,
    errorMessage?: string,
  ): Promise<INotificationLog | null> {
    const timestampField = status === 'DELIVERED' ? 'deliveredAt' : status === 'READ' ? 'readAt' : undefined;
    return NotificationLog.findOneAndUpdate(
      { metaMessageId },
      {
        $set: {
          status,
          ...(timestampField ? { [timestampField]: new Date() } : {}),
          ...(errorMessage ? { errorMessage } : {}),
        },
      },
      { new: true },
    );
  },

  async countByStatusSince(schoolId: string, since: Date): Promise<Record<string, number>> {
    const rows = await NotificationLog.aggregate<{ _id: string; count: number }>([
      { $match: { schoolId, createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  },

  async countTotalSince(schoolId: string, since: Date): Promise<number> {
    return NotificationLog.countDocuments({ schoolId, createdAt: { $gte: since } });
  },

  async recent(schoolId: string, limit = 20): Promise<INotificationLog[]> {
    return NotificationLog.find({ schoolId }).sort({ createdAt: -1 }).limit(limit);
  },
};
