import mongoose, { Document, Schema } from 'mongoose';
import type { ReportCategory, ReportFilters } from '@schoolos/types';

export interface ISavedReport extends Document {
  schoolId: string;
  name: string;
  description?: string;
  category: ReportCategory;
  filters: ReportFilters;
  isPublic: boolean;
  createdBy: string;
  createdByName: string;
  lastRunAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const savedReportSchema = new Schema<ISavedReport>(
  {
    schoolId:      { type: String, required: true },
    name:          { type: String, required: true, trim: true, maxlength: 200 },
    description:   { type: String, trim: true, maxlength: 500 },
    category: {
      type: String,
      enum: ['students', 'attendance', 'fees', 'admissions', 'timetable', 'calendar'],
      required: true,
    },
    filters: {
      dateFrom:     String,
      dateTo:       String,
      class:        String,
      section:      String,
      academicYear: String,
    },
    isPublic:      { type: Boolean, default: false },
    createdBy:     { type: String, required: true },
    createdByName: { type: String, required: true },
    lastRunAt:     { type: Date },
    isDeleted:     { type: Boolean, default: false },
    deletedAt:     { type: Date },
  },
  { timestamps: true, versionKey: false }
);

savedReportSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
savedReportSchema.index({ schoolId: 1, category: 1, isDeleted: 1 });
savedReportSchema.index({ schoolId: 1, createdBy: 1, isDeleted: 1 });

export const SavedReport = mongoose.model<ISavedReport>('SavedReport', savedReportSchema);
