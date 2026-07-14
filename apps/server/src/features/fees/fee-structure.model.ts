import mongoose, { Document, Schema } from 'mongoose';
import type { FeeHead } from './fee.model';

export interface IFeeStructure extends Document {
  schoolId: string;
  class: string;
  feeHead: FeeHead;
  academicYear: string;
  /** Which academic month this fee head applies to (e.g. "April"). Null/undefined
   *  means the head applies year-round regardless of month (e.g. Transport). */
  month?: string | null;
  amount: number;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    schoolId:     { type: String, required: true, index: true },
    class:        { type: String, required: true, trim: true },
    feeHead:      { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    month:        { type: String, trim: true, default: null },
    amount:       { type: Number, required: true, min: 0 },
    updatedBy:    { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

feeStructureSchema.index({ schoolId: 1, class: 1, feeHead: 1, academicYear: 1, month: 1 }, { unique: true });

export const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema);
