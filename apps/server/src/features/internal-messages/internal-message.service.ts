import { internalMessageRepository } from './internal-message.repository';
import { userRepository } from '../users/user.repository';
import { auditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { sendInternalMessageSchema, createMessageTemplateSchema } from './internal-message.validation';
import type { IInternalMessage } from './internal-message.model';
import type { IMessageTemplate } from './message-template.model';

function serializeMessage(m: IInternalMessage) {
  return {
    _id: String((m as unknown as { _id: { toString(): string } })._id),
    senderName: m.senderName,
    recipientUserId: m.recipientUserId,
    subject: m.subject,
    body: m.body,
    priority: m.priority,
    isRead: m.isRead,
    acknowledgedAt: m.acknowledgedAt ? m.acknowledgedAt.toISOString() : undefined,
    createdAt: (m.createdAt as Date).toISOString(),
  };
}

function serializeTemplate(t: IMessageTemplate) {
  return {
    _id: String((t as unknown as { _id: { toString(): string } })._id),
    title: t.title,
    subject: t.subject,
    body: t.body,
    priority: t.priority,
    createdByName: t.createdByName,
    createdAt: (t.createdAt as Date).toISOString(),
  };
}

export const internalMessageService = {
  async listForUser(userId: string, schoolId: string, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));

    const [messages, unreadCount] = await Promise.all([
      internalMessageRepository.findForRecipient(userId, schoolId, { page, limit }),
      internalMessageRepository.countUnread(userId, schoolId),
    ]);

    return { messages: messages.map(serializeMessage), unreadCount };
  },

  async listPendingAcknowledgment(userId: string, schoolId: string) {
    const messages = await internalMessageRepository.findPendingAcknowledgment(userId, schoolId);
    return messages.map(serializeMessage);
  },

  async markRead(userId: string, messageId: string): Promise<void> {
    const updated = await internalMessageRepository.markRead(messageId, userId);
    if (!updated) throw new NotFoundError('Message');
  },

  async acknowledge(userId: string, messageId: string, ctx: AuthContext): Promise<void> {
    const message = await internalMessageRepository.findById(messageId, ctx.schoolId);
    if (!message || message.recipientUserId !== userId) throw new NotFoundError('Message');
    if (message.priority !== 'high') throw new ValidationError('Only high priority messages require acknowledgment');

    const updated = await internalMessageRepository.acknowledge(messageId, userId);
    if (!updated) return; // already acknowledged, no-op

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'internal_message.acknowledged',
      resource: 'internal_message',
      resourceId: messageId,
      schoolId: ctx.schoolId,
      ip: ctx.ip,
    });
  },

  async send(rawInput: unknown, ctx: AuthContext) {
    const input = sendInternalMessageSchema.parse(rawInput);

    const recipientIds = new Set(input.recipientUserIds ?? []);
    if (input.recipientRole) {
      const roleUsers = await userRepository.findAll(ctx.schoolId, { role: input.recipientRole, limit: 500 });
      roleUsers.data.forEach((u) => recipientIds.add(String(u._id)));
    }
    recipientIds.delete(ctx.userId);

    if (recipientIds.size === 0) {
      throw new ValidationError('No valid recipients resolved for this message');
    }

    const created = await Promise.all(
      Array.from(recipientIds).map((recipientUserId) =>
        internalMessageRepository.create({
          schoolId: ctx.schoolId,
          senderUserId: ctx.userId,
          senderName: ctx.displayName,
          recipientUserId,
          subject: input.subject,
          body: input.body,
          priority: input.priority,
          templateId: input.templateId,
        })
      )
    );

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'internal_message.sent',
      resource: 'internal_message',
      resourceId: created[0] ? String((created[0] as unknown as { _id: { toString(): string } })._id) : 'batch',
      details: { recipientCount: created.length, priority: input.priority, subject: input.subject },
      schoolId: ctx.schoolId,
      ip: ctx.ip,
    });

    return { sent: created.length };
  },

  async listSent(userId: string, schoolId: string, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
    const messages = await internalMessageRepository.findSentBySender(userId, schoolId, { page, limit });
    return messages.map(serializeMessage);
  },

  async listTemplates(schoolId: string) {
    const templates = await internalMessageRepository.listTemplates(schoolId);
    return templates.map(serializeTemplate);
  },

  async createTemplate(rawInput: unknown, ctx: AuthContext) {
    const input = createMessageTemplateSchema.parse(rawInput);
    const template = await internalMessageRepository.createTemplate({
      schoolId: ctx.schoolId,
      title: input.title,
      subject: input.subject,
      body: input.body,
      priority: input.priority,
      createdByUserId: ctx.userId,
      createdByName: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'internal_message.template_created',
      resource: 'message_template',
      resourceId: String((template as unknown as { _id: { toString(): string } })._id),
      schoolId: ctx.schoolId,
      ip: ctx.ip,
    });

    return serializeTemplate(template);
  },

  async deleteTemplate(templateId: string, ctx: AuthContext): Promise<void> {
    const deleted = await internalMessageRepository.deleteTemplate(templateId, ctx.schoolId);
    if (!deleted) throw new NotFoundError('Template');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'internal_message.template_deleted',
      resource: 'message_template',
      resourceId: templateId,
      schoolId: ctx.schoolId,
      ip: ctx.ip,
    });
  },

  async staffDirectory(schoolId: string) {
    const roles = ['admin', 'principal', 'reception', 'teacher', 'accountant'] as const;
    const results = await Promise.all(
      roles.map((role) => userRepository.findAll(schoolId, { role, limit: 500, status: 'active' }))
    );
    return results
      .flatMap((r) => r.data)
      .map((u) => ({
        _id: String(u._id),
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
      }));
  },
};
