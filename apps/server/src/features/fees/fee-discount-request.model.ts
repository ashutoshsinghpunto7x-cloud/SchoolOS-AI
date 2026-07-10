import mongoose, { Document, Schema } from 'mongoose';

export type FeeDiscountStatus = 'pending' | 'approved' | 'rejected';

export interface IFeeDiscountRequest extends Document {
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  requestedAmount: number;
  reason: string;
  status: FeeDiscountStatus;
  requestedByName: string;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feeDiscountRequestSchema = new Schema<IFeeDiscountRequest>(
  {
    schoolId:        { type: String, required: true, index: true },
    studentId:       { type: String, required: true },
    studentName:     { type: String, required: true, trim: true },
    class:           { type: String, required: true, trim: true },
    section:         { type: String, required: true, trim: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    reason:          { type: String, required: true, trim: true, maxlength: 500 },
    status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedByName: { type: String, required: true },
    reviewedByName:  { type: String },
    reviewNote:      { type: String, trim: true, maxlength: 500 },
    reviewedAt:      { type: Date },
  },
  { timestamps: true, versionKey: false },
);

feeDiscountRequestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
feeDiscountRequestSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

export const FeeDiscountRequest = mongoose.model<IFeeDiscountRequest>('FeeDiscountRequest', feeDiscountRequestSchema);
