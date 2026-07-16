import mongoose, { Document, Schema } from 'mongoose';
import type { FeeHead } from './fee.model';

export interface ICollectionScheduleItem {
  /** Academic month the fee component belongs to (from the Fee Components tab), e.g. "April". */
  academicMonth: string;
  feeHead: FeeHead;
}

/**
 * School-wide (not per-class) plan of which academic-month fee components get
 * collected together in a given deposit month — purely a collection-planning
 * reference for the accountant, separate from the actual per-student billing
 * records that `FeeStructure`/`FeeRecord` generate.
 */
export interface ICollectionSchedule extends Document {
  schoolId: string;
  academicYear: string;
  depositMonth: string;
  items: ICollectionScheduleItem[];
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const collectionScheduleItemSchema = new Schema<ICollectionScheduleItem>(
  {
    academicMonth: { type: String, required: true, trim: true },
    feeHead:       { type: String, required: true, trim: true },
  },
  { _id: false },
);

const collectionScheduleSchema = new Schema<ICollectionSchedule>(
  {
    schoolId:     { type: String, required: true, index: true },
    academicYear: { type: String, required: true, trim: true },
    depositMonth: { type: String, required: true, trim: true },
    items:        { type: [collectionScheduleItemSchema], default: [] },
    updatedBy:    { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

collectionScheduleSchema.index({ schoolId: 1, academicYear: 1, depositMonth: 1 }, { unique: true });

export const CollectionSchedule = mongoose.model<ICollectionSchedule>('CollectionSchedule', collectionScheduleSchema);
