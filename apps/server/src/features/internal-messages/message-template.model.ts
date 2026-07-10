import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageTemplate extends Document {
  schoolId: string;
  title: string;
  subject: string;
  body: string;
  priority: 'normal' | 'high';
  createdByUserId: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageTemplateSchema = new Schema<IMessageTemplate>(
  {
    schoolId:        { type: String, required: true },
    title:           { type: String, required: true, trim: true },
    subject:         { type: String, required: true, trim: true },
    body:            { type: String, required: true, trim: true },
    priority:        { type: String, enum: ['normal', 'high'], default: 'normal' },
    createdByUserId: { type: String, required: true },
    createdByName:   { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false }
);

messageTemplateSchema.index({ schoolId: 1, createdAt: -1 });

export const MessageTemplate = mongoose.model<IMessageTemplate>('MessageTemplate', messageTemplateSchema);
