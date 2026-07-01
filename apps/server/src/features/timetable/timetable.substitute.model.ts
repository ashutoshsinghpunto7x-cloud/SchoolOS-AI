import mongoose, { Document, Schema } from 'mongoose';

export interface ITimetableSubstitute extends Document {
  schoolId: string;
  timetableId: string;
  class: string;
  section: string;
  date: Date;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  originalTeacherId?: string;
  originalTeacherName?: string;
  substituteTeacherName: string;
  substituteTeacherId?: string;
  reason?: string;
  notes?: string;
  status: 'active' | 'cancelled';
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const substituteSchema = new Schema<ITimetableSubstitute>(
  {
    schoolId:              { type: String, required: true, index: true },
    timetableId:           { type: String, required: true },
    class:                 { type: String, required: true },
    section:               { type: String, required: true },
    date:                  { type: Date, required: true },
    dayOfWeek:             { type: Number, required: true },
    slotId:                { type: String, required: true },
    subjectName:           { type: String, required: true, trim: true },
    originalTeacherId:     { type: String },
    originalTeacherName:   { type: String },
    substituteTeacherName: { type: String, required: true, trim: true },
    substituteTeacherId:   { type: String },
    reason:                { type: String, trim: true, maxlength: 500 },
    notes:                 { type: String, maxlength: 1000 },
    status:                { type: String, enum: ['active', 'cancelled'], default: 'active' },
    isDeleted:             { type: Boolean, default: false, index: true },
    deletedAt:             { type: Date },
    deletedBy:             { type: String },
    createdBy:             { type: String, required: true },
    updatedBy:             { type: String },
  },
  { timestamps: true, versionKey: false }
);

substituteSchema.index({ schoolId: 1, date: 1, isDeleted: 1 });
substituteSchema.index({ schoolId: 1, timetableId: 1, date: 1 });
substituteSchema.index({ schoolId: 1, substituteTeacherId: 1, date: 1 });

export const TimetableSubstitute = mongoose.model<ITimetableSubstitute>(
  'TimetableSubstitute',
  substituteSchema
);
