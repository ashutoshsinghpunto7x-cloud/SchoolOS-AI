import mongoose, { Document, Schema } from 'mongoose';
import type { FeeHead } from './fee.model';

export interface IFeeStructure extends Document {
  schoolId: string;
  class: string;
  feeHead: FeeHead;
  academicYear: string;
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
    amount:       { type: Number, required: true, min: 0 },
    updatedBy:    { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

feeStructureSchema.index({ schoolId: 1, class: 1, feeHead: 1, academicYear: 1 }, { unique: true });

export const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema);
