import { messageTemplateRepository } from './message-template.repository';
import { createTemplateSchema, updateTemplateSchema } from './communication-engine.validation';
import { INotificationTemplate } from './message-template.model';
import { AuthContext } from '../../lib/auth-context';
import { NotFoundError } from '../../middlewares/errorHandler';
import { auditService } from '../audit/audit.service';

export const messageTemplateService = {
  async list(ctx: AuthContext): Promise<INotificationTemplate[]> {
    return messageTemplateRepository.list(ctx.schoolId);
  },

  async create(rawInput: unknown, ctx: AuthContext): Promise<INotificationTemplate> {
    const data = createTemplateSchema.parse(rawInput);
    const template = await messageTemplateRepository.create({ ...data, schoolId: ctx.schoolId, createdBy: ctx.displayName });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'message_template.created', resource: 'message_template', resourceId: template._id.toString(),
      details: { notificationType: data.notificationType, channel: data.channel }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return template;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<INotificationTemplate> {
    const data = updateTemplateSchema.parse(rawInput);
    const updated = await messageTemplateRepository.update(id, ctx.schoolId, data, ctx.displayName);
    if (!updated) throw new NotFoundError('Message template');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'message_template.updated', resource: 'message_template', resourceId: id,
      details: { fields: Object.keys(data) }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async activate(id: string, ctx: AuthContext): Promise<INotificationTemplate> {
    const updated = await messageTemplateRepository.activate(id, ctx.schoolId, ctx.displayName);
    if (!updated) throw new NotFoundError('Message template');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'message_template.updated', resource: 'message_template', resourceId: id,
      details: { activated: true }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async remove(id: string, ctx: AuthContext): Promise<void> {
    const removed = await messageTemplateRepository.remove(id, ctx.schoolId);
    if (!removed) throw new NotFoundError('Message template (or it is a default template, which cannot be deleted)');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'message_template.deleted', resource: 'message_template', resourceId: id,
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
