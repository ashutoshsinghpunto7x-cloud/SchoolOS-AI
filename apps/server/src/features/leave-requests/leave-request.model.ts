import mongoose, { Document, Schema } from 'mongoose';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'full_day' | 'half_day';

export interface ILeaveRequest extends Document {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  requestedByUserId: string;
  leaveType: LeaveType;
  dateFrom: string;
  dateTo: string;
  reason: string;
  status: LeaveRequestStatus;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    schoolId:          { type: String, required: true },
    teacherId:         { type: String, required: true },
    teacherName:       { type: String, required: true, trim: true },
    requestedByUserId: { type: String, required: true },
    leaveType:         { type: String, enum: ['full_day', 'half_day'], required: true },
    dateFrom:          { type: String, required: true },
    dateTo:            { type: String, required: true },
    reason:            { type: String, required: true, trim: true },
    status:            { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedByName:    { type: String, trim: true },
    reviewNote:        { type: String, trim: true },
    reviewedAt:        { type: Date },
  },
  { timestamps: true, versionKey: false },
);

leaveRequestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
leaveRequestSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
