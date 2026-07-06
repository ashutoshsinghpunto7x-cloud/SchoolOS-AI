import mongoose, { Document, Schema } from 'mongoose';

export interface IEventRead extends Document {
  schoolId: string;
  eventId: string;
  userId: string;
  userDisplayName: string;
  userRole: string;
  readAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventReadSchema = new Schema<IEventRead>(
  {
    schoolId:        { type: String, required: true, default: 'school_001' },
    eventId:         { type: String, required: true, index: true },
    userId:          { type: String, required: true, index: true },
    userDisplayName: { type: String, required: true },
    userRole:        { type: String, required: true },
    readAt:          { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

eventReadSchema.index({ schoolId: 1, eventId: 1, userId: 1 }, { unique: true });

export const EventRead = mongoose.model<IEventRead>('EventRead', eventReadSchema);
