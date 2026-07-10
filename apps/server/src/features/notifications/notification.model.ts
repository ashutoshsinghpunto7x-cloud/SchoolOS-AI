import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 'defaulters_list' | 'message' | 'change_request' | 'leave_request' | 'substitution';
export type NotificationPriority = 'normal' | 'high';

export interface INotification extends Document {
  recipientUserId: string;
  schoolId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  priority: NotificationPriority;
  senderUserId: string;
  senderName: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientUserId: { type: String, required: true },
    schoolId:        { type: String, required: true },
    type:            { type: String, enum: ['defaulters_list', 'message', 'change_request', 'leave_request', 'substitution'], required: true },
    title:           { type: String, required: true, trim: true },
    body:            { type: String, required: true, trim: true },
    payload:         { type: Schema.Types.Mixed },
    priority:        { type: String, enum: ['normal', 'high'], default: 'normal' },
    senderUserId:    { type: String, required: true },
    senderName:      { type: String, required: true, trim: true },
    isRead:          { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ recipientUserId: 1, schoolId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
