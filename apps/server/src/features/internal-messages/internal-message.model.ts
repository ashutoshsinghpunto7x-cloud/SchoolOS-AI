import mongoose, { Document, Schema } from 'mongoose';

export type InternalMessagePriority = 'normal' | 'high';

export interface IInternalMessage extends Document {
  schoolId: string;
  senderUserId: string;
  senderName: string;
  recipientUserId: string;
  subject: string;
  body: string;
  priority: InternalMessagePriority;
  templateId?: string;
  isRead: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const internalMessageSchema = new Schema<IInternalMessage>(
  {
    schoolId:        { type: String, required: true },
    senderUserId:    { type: String, required: true },
    senderName:      { type: String, required: true, trim: true },
    recipientUserId: { type: String, required: true },
    subject:         { type: String, required: true, trim: true },
    body:            { type: String, required: true, trim: true },
    priority:        { type: String, enum: ['normal', 'high'], default: 'normal' },
    templateId:      { type: String },
    isRead:          { type: Boolean, default: false },
    acknowledgedAt:  { type: Date },
  },
  { timestamps: true, versionKey: false }
);

internalMessageSchema.index({ recipientUserId: 1, schoolId: 1, createdAt: -1 });
internalMessageSchema.index({ recipientUserId: 1, priority: 1, acknowledgedAt: 1 });
internalMessageSchema.index({ schoolId: 1, senderUserId: 1, createdAt: -1 });

export const InternalMessage = mongoose.model<IInternalMessage>('InternalMessage', internalMessageSchema);
