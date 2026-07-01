import mongoose, { Document, Schema } from 'mongoose';

export interface IPeriodSlot extends Document {
  schoolId: string;
  name: string;
  orderIndex: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  daysApplicable: number[];
  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const periodSlotSchema = new Schema<IPeriodSlot>(
  {
    schoolId:        { type: String, required: true, index: true },
    name:            { type: String, required: true, trim: true, maxlength: 50 },
    orderIndex:      { type: Number, required: true },
    startTime:       { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime:         { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    isBreak:         { type: Boolean, default: false },
    daysApplicable:  { type: [Number], default: [1, 2, 3, 4, 5] },
    isDeleted:       { type: Boolean, default: false, index: true },
    createdBy:       { type: String, required: true },
    updatedBy:       { type: String },
  },
  { timestamps: true, versionKey: false }
);

periodSlotSchema.index({ schoolId: 1, isDeleted: 1, orderIndex: 1 });

export const PeriodSlot = mongoose.model<IPeriodSlot>('PeriodSlot', periodSlotSchema);
