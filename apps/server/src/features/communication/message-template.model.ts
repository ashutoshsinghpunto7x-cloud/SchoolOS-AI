import mongoose, { Document, Schema } from 'mongoose';
import { NotificationChannel, NotificationType } from './notification-types';

/**
 * Editable message templates for the notification engine. Seeded per-school
 * from templates/default-templates.ts on first read (see
 * message-template.repository.ts#getActiveOrSeedDefault) so an admin can
 * tweak wording later without touching code.
 *
 * Registered as 'NotificationTemplate' (not 'MessageTemplate') — the
 * internal-messages feature already owns a Mongoose model named
 * 'MessageTemplate' for unrelated staff-messaging templates.
 */
export interface INotificationTemplate extends Document {
  schoolId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  name: string;
  /** Raw body with {{placeholder}} tokens — see templates/template-engine.ts. */
  body: string;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    schoolId: { type: String, required: true },
    notificationType: { type: String, required: true },
    channel: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

notificationTemplateSchema.index({ schoolId: 1, notificationType: 1, channel: 1, isActive: 1 });

export const NotificationTemplate = mongoose.model<INotificationTemplate>('NotificationTemplate', notificationTemplateSchema);
