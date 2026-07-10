import { InternalMessage, IInternalMessage, InternalMessagePriority } from './internal-message.model';
import { MessageTemplate, IMessageTemplate } from './message-template.model';

interface CreateMessageInput {
  schoolId: string;
  senderUserId: string;
  senderName: string;
  recipientUserId: string;
  subject: string;
  body: string;
  priority: InternalMessagePriority;
  templateId?: string;
}

interface CreateTemplateInput {
  schoolId: string;
  title: string;
  subject: string;
  body: string;
  priority: InternalMessagePriority;
  createdByUserId: string;
  createdByName: string;
}

export const internalMessageRepository = {
  async create(data: CreateMessageInput): Promise<IInternalMessage> {
    return InternalMessage.create(data);
  },

  async findForRecipient(
    userId: string,
    schoolId: string,
    opts: { page: number; limit: number }
  ): Promise<IInternalMessage[]> {
    const skip = (opts.page - 1) * opts.limit;
    return InternalMessage.find({ recipientUserId: userId, schoolId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .lean<IInternalMessage[]>();
  },

  async countUnread(userId: string, schoolId: string): Promise<number> {
    return InternalMessage.countDocuments({ recipientUserId: userId, schoolId, isRead: false });
  },

  async findPendingAcknowledgment(userId: string, schoolId: string): Promise<IInternalMessage[]> {
    return InternalMessage.find({
      recipientUserId: userId,
      schoolId,
      priority: 'high',
      acknowledgedAt: { $exists: false },
    })
      .sort({ createdAt: 1 })
      .lean<IInternalMessage[]>();
  },

  async findById(id: string, schoolId: string): Promise<IInternalMessage | null> {
    return InternalMessage.findOne({ _id: id, schoolId });
  },

  async markRead(id: string, userId: string): Promise<boolean> {
    const result = await InternalMessage.updateOne(
      { _id: id, recipientUserId: userId },
      { $set: { isRead: true } }
    );
    return result.modifiedCount > 0;
  },

  async acknowledge(id: string, userId: string): Promise<boolean> {
    const result = await InternalMessage.updateOne(
      { _id: id, recipientUserId: userId, acknowledgedAt: { $exists: false } },
      { $set: { acknowledgedAt: new Date(), isRead: true } }
    );
    return result.modifiedCount > 0;
  },

  async findSentBySender(
    senderUserId: string,
    schoolId: string,
    opts: { page: number; limit: number }
  ): Promise<IInternalMessage[]> {
    const skip = (opts.page - 1) * opts.limit;
    return InternalMessage.find({ senderUserId, schoolId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .lean<IInternalMessage[]>();
  },

  async createTemplate(data: CreateTemplateInput): Promise<IMessageTemplate> {
    return MessageTemplate.create(data);
  },

  async listTemplates(schoolId: string): Promise<IMessageTemplate[]> {
    return MessageTemplate.find({ schoolId }).sort({ createdAt: -1 }).lean<IMessageTemplate[]>();
  },

  async findTemplateById(id: string, schoolId: string): Promise<IMessageTemplate | null> {
    return MessageTemplate.findOne({ _id: id, schoolId });
  },

  async deleteTemplate(id: string, schoolId: string): Promise<boolean> {
    const result = await MessageTemplate.deleteOne({ _id: id, schoolId });
    return result.deletedCount > 0;
  },
};
