import { notificationRepository } from './notification.repository';
import { teacherRepository } from '../teachers/teacher.repository';
import { userRepository } from '../users/user.repository';
import { NotFoundError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { sendMessageToTeachersSchema } from './notification.validation';
import type { NotificationType } from './notification.model';
import type { NotificationListResult, SendMessageToTeachersResult } from '@schoolos/types';

interface SendToTeachersInput {
  teacherIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

interface SendToUserInput {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

export const notificationService = {
  async listForUser(
    userId: string,
    schoolId: string,
    opts: { page?: number; limit?: number } = {}
  ): Promise<NotificationListResult> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));

    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.findForRecipient(userId, schoolId, { page, limit }),
      notificationRepository.countUnread(userId, schoolId),
    ]);

    return {
      notifications: notifications.map((n) => ({
        _id: String((n as unknown as { _id: { toString(): string } })._id),
        type: n.type,
        title: n.title,
        body: n.body,
        payload: n.payload,
        senderName: n.senderName,
        isRead: n.isRead,
        createdAt: (n.createdAt as Date).toISOString(),
      })),
      unreadCount,
    };
  },

  async markRead(userId: string, notificationId: string): Promise<void> {
    const updated = await notificationRepository.markRead(notificationId, userId);
    if (!updated) throw new NotFoundError('Notification');
  },

  async markAllRead(userId: string, schoolId: string): Promise<void> {
    await notificationRepository.markAllRead(userId, schoolId);
  },

  /**
   * Resolves each teacherId to its linked login account — same email-match
   * convention teacher.service.ts's linkUserAccount() relies on — and creates
   * one notification per resolved recipient. Teachers with no linked account
   * (no email, or no matching User) are silently skipped and reported back.
   */
  async sendToTeachers(input: SendToTeachersInput, ctx: AuthContext): Promise<SendMessageToTeachersResult> {
    const skipped: string[] = [];
    let sent = 0;

    for (const teacherId of input.teacherIds) {
      const teacher = await teacherRepository.findById(teacherId, ctx.schoolId);
      if (!teacher?.email) {
        skipped.push(teacherId);
        continue;
      }

      const user = await userRepository.findByEmail(teacher.email);
      if (!user || user.schoolId !== ctx.schoolId || user.role !== 'teacher') {
        skipped.push(teacherId);
        continue;
      }

      await notificationRepository.create({
        recipientUserId: String(user._id),
        schoolId: ctx.schoolId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload,
        senderUserId: ctx.userId,
        senderName: ctx.displayName,
      });
      sent += 1;
    }

    return { sent, skipped };
  },

  /** Direct send to a known User id — skips the Teacher-lookup indirection sendToTeachers relies on. */
  async sendToUser(input: SendToUserInput, ctx: AuthContext): Promise<void> {
    await notificationRepository.create({
      recipientUserId: input.recipientUserId,
      schoolId: ctx.schoolId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload,
      senderUserId: ctx.userId,
      senderName: ctx.displayName,
    });
  },

  /** Notifies every admin User in the school (e.g. a new change request awaiting review). */
  async sendToAdmins(input: Omit<SendToUserInput, 'recipientUserId'>, ctx: AuthContext): Promise<void> {
    const admins = await userRepository.findAll(ctx.schoolId, { role: 'admin', limit: 100 });
    await Promise.all(
      admins.data.map((admin) =>
        notificationRepository.create({
          recipientUserId: String(admin._id),
          schoolId: ctx.schoolId,
          type: input.type,
          title: input.title,
          body: input.body,
          payload: input.payload,
          senderUserId: ctx.userId,
          senderName: ctx.displayName,
        }),
      ),
    );
  },

  /** Notifies every admin and principal User in the school (e.g. a new leave request awaiting review). */
  async sendToApprovers(input: Omit<SendToUserInput, 'recipientUserId'>, ctx: AuthContext): Promise<void> {
    const [admins, principals] = await Promise.all([
      userRepository.findAll(ctx.schoolId, { role: 'admin', limit: 100 }),
      userRepository.findAll(ctx.schoolId, { role: 'principal', limit: 100 }),
    ]);
    const approvers = [...admins.data, ...principals.data];
    await Promise.all(
      approvers.map((approver) =>
        notificationRepository.create({
          recipientUserId: String(approver._id),
          schoolId: ctx.schoolId,
          type: input.type,
          title: input.title,
          body: input.body,
          payload: input.payload,
          senderUserId: ctx.userId,
          senderName: ctx.displayName,
        }),
      ),
    );
  },

  async broadcastToTeachers(rawInput: unknown, ctx: AuthContext): Promise<SendMessageToTeachersResult> {
    const input = sendMessageToTeachersSchema.parse(rawInput);
    return notificationService.sendToTeachers(
      {
        teacherIds: input.teacherIds,
        type: 'message',
        title: input.title,
        body: input.message,
      },
      ctx
    );
  },
};
