import mongoose, { Document, Schema } from 'mongoose';

// One active AcademicYear per school at a time. Phase 1: seeded automatically
// from SchoolSettings.academicYearStart/End (see academic-year.service.ts
// getOrSeed) rather than requiring the full Setup Wizard — that wizard UI is
// Phase 2 of the Academic Planning Engine rollout. Terms/specialDays start
// empty and can be filled in later without disrupting anything already
// generated (the engine treats an empty terms[] as "one term = the whole
// year").

export type AcademicYearStatus = 'draft' | 'active' | 'closed';

export type SpecialDayType =
  | 'sports_day' | 'annual_day' | 'trip' | 'ptm' | 'activity' | 'function' | 'other';

export interface IAcademicTerm {
  termId: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface IAcademicSpecialDay {
  date: Date;
  label: string;
  type: SpecialDayType;
  teachingImpact: 'full_day_off' | 'half_day' | 'none';
}

export interface IAcademicYear extends Document {
  schoolId: string;
  label: string;
  startDate: Date;
  endDate: Date;
  weeklyOffDays: number[]; // 0 = Sun .. 6 = Sat
  terms: IAcademicTerm[];
  specialDays: IAcademicSpecialDay[];
  status: AcademicYearStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SPECIAL_DAY_TYPES: SpecialDayType[] = [
  'sports_day', 'annual_day', 'trip', 'ptm', 'activity', 'function', 'other',
];

const academicTermSchema = new Schema<IAcademicTerm>(
  {
    termId:    { type: String, required: true },
    label:     { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
  },
  { _id: false },
);

const specialDaySchema = new Schema<IAcademicSpecialDay>(
  {
    date:           { type: Date, required: true },
    label:          { type: String, required: true, trim: true },
    type:           { type: String, enum: SPECIAL_DAY_TYPES, default: 'other' },
    teachingImpact: { type: String, enum: ['full_day_off', 'half_day', 'none'], default: 'full_day_off' },
  },
  { _id: false },
);

const academicYearSchema = new Schema<IAcademicYear>(
  {
    schoolId:      { type: String, required: true, default: 'DEMO_SCHOOL' },
    label:         { type: String, required: true, trim: true },
    startDate:     { type: Date, required: true },
    endDate:       { type: Date, required: true },
    weeklyOffDays: { type: [Number], default: [0, 6] },
    terms:         { type: [academicTermSchema], default: [] },
    specialDays:   { type: [specialDaySchema], default: [] },
    status:        { type: String, enum: ['draft', 'active', 'closed'], default: 'active' },
  },
  { timestamps: true, versionKey: false },
);

academicYearSchema.index({ schoolId: 1, status: 1 });

export const AcademicYear = mongoose.model<IAcademicYear>('AcademicYear', academicYearSchema);
