import mongoose, { Document, Schema } from 'mongoose';

export type RecoveryRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface IRecoveryRequest extends Document {
  schoolId: string;
  employeeId: string;
  email: string;
  userId?: string;
  status: RecoveryRequestStatus;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  temporaryPasswordExpiresAt?: Date;
  rejectionReason?: string;
  ipAddress?: string;
  browser?: string;
  device?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recoveryRequestSchema = new Schema<IRecoveryRequest>(
  {
    schoolId:   { type: String, required: true, index: true },
    employeeId: { type: String, required: true, trim: true },
    email:      { type: String, required: true, lowercase: true, trim: true },
    userId:     { type: String },
    status:     { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
    requestedAt: { type: Date, required: true, default: Date.now },
    approvedAt:  { type: Date },
    approvedBy:  { type: String },
    temporaryPasswordExpiresAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    ipAddress:  { type: String },
    browser:    { type: String },
    device:     { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

recoveryRequestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
recoveryRequestSchema.index({ email: 1, status: 1 });

export const RecoveryRequest = mongoose.model<IRecoveryRequest>('RecoveryRequest', recoveryRequestSchema);
