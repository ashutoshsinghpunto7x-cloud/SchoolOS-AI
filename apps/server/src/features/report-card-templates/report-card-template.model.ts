import mongoose, { Document, Schema } from 'mongoose';
import { SubjectEvaluationType } from '../exams/exam.model';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ReportCardTemplateStatus = 'draft' | 'published';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface ITemplateSubjectRow {
  _id: mongoose.Types.ObjectId;
  name: string;
  evaluationType: SubjectEvaluationType;
  order: number;
  unitTestMaxMarks: number;
  mainExamMaxMarks: number;
}

export interface ITemplateSkillRow {
  _id: mongoose.Types.ObjectId;
  label: string;
  order: number;
}

export interface ITemplateSkillSection {
  _id: mongoose.Types.ObjectId;
  name: string;
  order: number;
  rows: ITemplateSkillRow[];
}

export interface ITemplateGradingKeyEntry {
  label: string;
  description: string;
  order: number;
}

export interface ITemplateExamSlot {
  unitTest1ExamId?: string;
  unitTest2ExamId?: string;
  mainExamId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ITemplateExamSlots {
  firstTerm: ITemplateExamSlot;
  finalTerm: ITemplateExamSlot;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IReportCardTemplate extends Document {
  schoolId: string;
  class: string;
  academicYear: string;
  status: ReportCardTemplateStatus;
  subjects: ITemplateSubjectRow[];
  skillSections: ITemplateSkillSection[];
  gradingKey: ITemplateGradingKeyEntry[];
  examSlots: ITemplateExamSlots;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const templateSubjectRowSchema = new Schema<ITemplateSubjectRow>(
  {
    name:             { type: String, required: true, trim: true },
    evaluationType:   { type: String, enum: ['marks', 'grade', 'both'], default: 'marks' },
    order:            { type: Number, required: true, default: 0 },
    unitTestMaxMarks: { type: Number, required: true, min: 0, default: 20 },
    mainExamMaxMarks: { type: Number, required: true, min: 0, default: 80 },
  },
  { timestamps: false },
);

const templateSkillRowSchema = new Schema<ITemplateSkillRow>(
  {
    label: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: false },
);

const templateSkillSectionSchema = new Schema<ITemplateSkillSection>(
  {
    name:  { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    rows:  { type: [templateSkillRowSchema], default: [] },
  },
  { timestamps: false },
);

const templateGradingKeyEntrySchema = new Schema<ITemplateGradingKeyEntry>(
  {
    label:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    order:       { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const templateExamSlotSchema = new Schema<ITemplateExamSlot>(
  {
    unitTest1ExamId: { type: String },
    unitTest2ExamId: { type: String },
    mainExamId:      { type: String },
    startDate:       { type: String },
    endDate:         { type: String },
  },
  { _id: false },
);

const templateExamSlotsSchema = new Schema<ITemplateExamSlots>(
  {
    firstTerm: { type: templateExamSlotSchema, required: true, default: () => ({}) },
    finalTerm: { type: templateExamSlotSchema, required: true, default: () => ({}) },
  },
  { _id: false },
);

const reportCardTemplateSchema = new Schema<IReportCardTemplate>(
  {
    schoolId:      { type: String, required: true, default: 'DEMO_SCHOOL' },
    class:         { type: String, required: true, trim: true },
    academicYear:  { type: String, required: true, trim: true },
    status:        { type: String, enum: ['draft', 'published'], default: 'draft' },
    subjects:      { type: [templateSubjectRowSchema], default: [] },
    skillSections: { type: [templateSkillSectionSchema], default: [] },
    gradingKey:    { type: [templateGradingKeyEntrySchema], default: [] },
    examSlots:     { type: templateExamSlotsSchema, required: true, default: () => ({ firstTerm: {}, finalTerm: {} }) },
    createdBy:     { type: String },
    updatedBy:     { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// One template per class per academic year — reused across all sections of that class.
reportCardTemplateSchema.index({ schoolId: 1, class: 1, academicYear: 1 }, { unique: true });

export const ReportCardTemplate = mongoose.model<IReportCardTemplate>('ReportCardTemplate', reportCardTemplateSchema);
