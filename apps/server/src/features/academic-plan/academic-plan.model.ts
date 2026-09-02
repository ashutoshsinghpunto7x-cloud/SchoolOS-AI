import mongoose, { Document, Schema } from 'mongoose';

// AcademicPlan is the Academic Planning Engine's output — supersedes
// TeacherPlanner (apps/server/src/features/teacher-planner). During the
// Phase 1→5 migration both are written; see "The Planning Engine" design
// doc §9. Unlike TeacherPlanner (weekly buckets, upsert overwrites `weeks`
// wholesale), this is day-granular and versioned — every regenerate/edit
// bumps `version` and appends to `history` rather than silently replacing
// prior state.

export type AcademicPlanBlockType = 'teach' | 'revision' | 'assessment' | 'buffer';
export type AcademicPlanDayStatus =
  | 'pending' | 'completed' | 'partial' | 'carried_forward' | 'needs_extra_class';

export interface IAcademicPlanDay {
  date: Date;
  blockType: AcademicPlanBlockType;
  chapterId?: string;
  chapterName?: string;
  topicTitle?: string;
  examId?: string;
  examName?: string;
  status: AcademicPlanDayStatus;
  carriedFromDate?: Date;
  note?: string;
  /** True once a teacher has hand-edited or drag-swapped this day.
   *  Regenerate preserves these days verbatim instead of recomputing them. */
  manuallyEdited?: boolean;
}

export interface IAcademicPlanHistoryEntry {
  version: number;
  changedBy: string;
  changedAt: Date;
  reason: string;
}

export interface IAcademicPlan extends Document {
  schoolId: string;
  academicYearId: string;
  teacherId: string;
  class: string;
  section?: string;
  subject: string;
  version: number;
  generatedFrom: 'engine' | 'manual_override';
  days: IAcademicPlanDay[];
  history: IAcademicPlanHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const BLOCK_TYPES: AcademicPlanBlockType[] = ['teach', 'revision', 'assessment', 'buffer'];
const DAY_STATUSES: AcademicPlanDayStatus[] = ['pending', 'completed', 'partial', 'carried_forward', 'needs_extra_class'];

const planDaySchema = new Schema<IAcademicPlanDay>(
  {
    date:            { type: Date, required: true },
    blockType:       { type: String, enum: BLOCK_TYPES, required: true },
    chapterId:       { type: String },
    chapterName:     { type: String, trim: true },
    topicTitle:      { type: String, trim: true },
    examId:          { type: String },
    examName:        { type: String, trim: true },
    status:          { type: String, enum: DAY_STATUSES, default: 'pending' },
    carriedFromDate: { type: Date },
    note:            { type: String, trim: true },
    manuallyEdited:  { type: Boolean, default: false },
  },
  { _id: false },
);

const historyEntrySchema = new Schema<IAcademicPlanHistoryEntry>(
  {
    version:   { type: Number, required: true },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, required: true },
    reason:    { type: String, required: true, trim: true },
  },
  { _id: false },
);

const academicPlanSchema = new Schema<IAcademicPlan>(
  {
    schoolId:       { type: String, required: true, default: 'DEMO_SCHOOL' },
    academicYearId: { type: String, required: true },
    teacherId:      { type: String, required: true },
    class:          { type: String, required: true, trim: true },
    section:        { type: String, trim: true },
    subject:        { type: String, required: true, trim: true },
    version:        { type: Number, required: true, default: 1 },
    generatedFrom:  { type: String, enum: ['engine', 'manual_override'], default: 'engine' },
    days:           { type: [planDaySchema], default: [] },
    history:        { type: [historyEntrySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

// One live plan per teacher+class+section+subject+year — same one-per-scope
// shape as TeacherPlanner, but regeneration updates in place (version++)
// rather than being keyed by academicYearStart the way TeacherPlanner is.
academicPlanSchema.index(
  { schoolId: 1, teacherId: 1, class: 1, section: 1, subject: 1, academicYearId: 1 },
  { unique: true },
);
academicPlanSchema.index({ schoolId: 1, class: 1, section: 1, subject: 1 });

export const AcademicPlan = mongoose.model<IAcademicPlan>('AcademicPlan', academicPlanSchema);
