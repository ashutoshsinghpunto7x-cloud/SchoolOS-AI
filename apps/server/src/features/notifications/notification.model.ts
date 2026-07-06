import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 'defaulters_list' | 'message' | 'change_request';

export interface INotification extends Document {
  recipientUserId: string;
  schoolId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
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
    type:            { type: String, enum: ['defaulters_list', 'message', 'change_request'], required: true },
    title:           { type: String, required: true, trim: true },
    body:            { type: String, required: true, trim: true },
    payload:         { type: Schema.Types.Mixed },
    senderUserId:    { type: String, required: true },
    senderName:      { type: String, required: true, trim: true },
    isRead:          { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ recipientUserId: 1, schoolId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
