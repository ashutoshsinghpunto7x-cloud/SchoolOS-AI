import { NotificationTemplate, INotificationTemplate } from './message-template.model';
import { NotificationChannel, NotificationType } from './notification-types';
import { DEFAULT_TEMPLATE_BODIES } from './templates/default-templates';

export const messageTemplateRepository = {
  async list(schoolId: string): Promise<INotificationTemplate[]> {
    return NotificationTemplate.find({ schoolId }).sort({ notificationType: 1, channel: 1 });
  },

  async findById(id: string, schoolId: string): Promise<INotificationTemplate | null> {
    return NotificationTemplate.findOne({ _id: id, schoolId });
  },

  /**
   * Returns the active template body for a type/channel, seeding one from
   * DEFAULT_TEMPLATE_BODIES on first use so every school starts with working
   * copy that's editable afterwards without a code change.
   */
  async getActiveOrSeedDefault(
    schoolId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
    createdBy: string,
  ): Promise<INotificationTemplate> {
    const existing = await NotificationTemplate.findOne({ schoolId, notificationType, channel, isActive: true });
    if (existing) return existing;

    return NotificationTemplate.create({
      schoolId,
      notificationType,
      channel,
      name: `${notificationType} (default)`,
      body: DEFAULT_TEMPLATE_BODIES[notificationType],
      isDefault: true,
      isActive: true,
      createdBy,
    });
  },

  async create(data: {
    schoolId: string;
    notificationType: NotificationType;
    channel: NotificationChannel;
    name: string;
    body: string;
    createdBy: string;
  }): Promise<INotificationTemplate> {
    return NotificationTemplate.create({ ...data, isDefault: false, isActive: false });
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<{ name: string; body: string; isActive: boolean }>,
    updatedBy: string,
  ): Promise<INotificationTemplate | null> {
    return NotificationTemplate.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { ...data, updatedBy } },
      { new: true },
    );
  },

  /**
   * Activating a template deactivates any other template for the same
   * type/channel, since getActiveOrSeedDefault always expects at most one
   * active template per (schoolId, notificationType, channel).
   */
  async activate(id: string, schoolId: string, updatedBy: string): Promise<INotificationTemplate | null> {
    const template = await NotificationTemplate.findOne({ _id: id, schoolId });
    if (!template) return null;

    await NotificationTemplate.updateMany(
      { schoolId, notificationType: template.notificationType, channel: template.channel, _id: { $ne: id } },
      { $set: { isActive: false } },
    );
    template.isActive = true;
    template.updatedBy = updatedBy;
    await template.save();
    return template;
  },

  async remove(id: string, schoolId: string): Promise<INotificationTemplate | null> {
    return NotificationTemplate.findOneAndDelete({ _id: id, schoolId, isDefault: false });
  },
};
