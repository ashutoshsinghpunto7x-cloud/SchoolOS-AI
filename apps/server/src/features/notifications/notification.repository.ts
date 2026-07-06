import { Notification, INotification, NotificationType } from './notification.model';

interface CreateInput {
  recipientUserId: string;
  schoolId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  senderUserId: string;
  senderName: string;
}

export const notificationRepository = {
  async create(data: CreateInput): Promise<INotification> {
    return Notification.create(data);
  },

  async findForRecipient(
    userId: string,
    schoolId: string,
    opts: { page: number; limit: number }
  ): Promise<INotification[]> {
    const skip = (opts.page - 1) * opts.limit;
    return Notification.find({ recipientUserId: userId, schoolId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .lean<INotification[]>();
  },

  async countUnread(userId: string, schoolId: string): Promise<number> {
    return Notification.countDocuments({ recipientUserId: userId, schoolId, isRead: false });
  },

  async markRead(id: string, userId: string): Promise<boolean> {
    const result = await Notification.updateOne(
      { _id: id, recipientUserId: userId },
      { $set: { isRead: true } }
    );
    return result.modifiedCount > 0;
  },

  async markAllRead(userId: string, schoolId: string): Promise<void> {
    await Notification.updateMany(
      { recipientUserId: userId, schoolId, isRead: false },
      { $set: { isRead: true } }
    );
  },
};
