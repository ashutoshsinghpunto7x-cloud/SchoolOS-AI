import mongoose, { Document, Schema } from 'mongoose';
import { SubjectEvaluationType } from '../exams/exam.model';
import { ResultStatus } from '../marks/marks.model';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type PromotionStatus = 'promoted' | 'not_promoted' | 'pending';
export type ReportCardStatus = 'draft' | 'published';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface ISubjectRow {
  subjectName: string;
  evaluationType: SubjectEvaluationType;
  maxMarks?: number;
  marksObtained?: number;
  percentage?: number;
  grade?: string;
  result: ResultStatus;
  teacherRemark?: string;
}

export interface ICoScholasticEntry {
  activity: string;
  grade: string; // e.g. 'A+' | 'A' | 'B' | 'C' | 'D' | '' (not yet graded)
}

export interface IReportCardSummary {
  totalMaxMarks: number;
  totalObtained: number;
  percentage: number;
  overallGrade?: string;
  rank?: number;
  classSize?: number;
  promotionStatus: PromotionStatus;
  highestMarksPercent?: number;
  classAveragePercent?: number;
}

export interface IReportCardAttendance {
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leaveApproved: number;
  percent: number;
}

export interface IReportCardAiRemark {
  text: string;
  generatedAt?: Date;
  model?: string;
  edited: boolean;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IReportCard extends Document {
  schoolId: string;
  examId: string;
  studentId: string;
  class: string;
  section: string;
  subjects: ISubjectRow[];
  coScholastic: ICoScholasticEntry[];
  summary: IReportCardSummary;
  attendance: IReportCardAttendance;
  aiRemark?: IReportCardAiRemark;
  teacherRemark?: string;
  principalRemark?: string;
  parentFeedback?: string;
  warnings: string[];
  verificationToken: string;
  status: ReportCardStatus;
  generatedById: string;
  generatedByName: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const subjectRowSchema = new Schema<ISubjectRow>(
  {
    subjectName:    { type: String, required: true, trim: true },
    evaluationType: { type: String, enum: ['marks', 'grade', 'both'], default: 'marks' },
    maxMarks:       { type: Number, min: 0 },
    marksObtained:  { type: Number, min: 0 },
    percentage:     { type: Number, min: 0, max: 100 },
    grade:          { type: String, trim: true },
    result:         { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
    teacherRemark:  { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const coScholasticEntrySchema = new Schema<ICoScholasticEntry>(
  {
    activity: { type: String, required: true, trim: true },
    grade:    { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const summarySchema = new Schema<IReportCardSummary>(
  {
    totalMaxMarks:       { type: Number, required: true, default: 0 },
    totalObtained:       { type: Number, required: true, default: 0 },
    percentage:          { type: Number, required: true, default: 0 },
    overallGrade:        { type: String, trim: true },
    rank:                { type: Number, min: 1 },
    classSize:           { type: Number, min: 0 },
    promotionStatus:     { type: String, enum: ['promoted', 'not_promoted', 'pending'], default: 'pending' },
    highestMarksPercent: { type: Number, min: 0, max: 100 },
    classAveragePercent: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

const attendanceSchema = new Schema<IReportCardAttendance>(
  {
    workingDays:   { type: Number, required: true, default: 0 },
    present:       { type: Number, required: true, default: 0 },
    absent:        { type: Number, required: true, default: 0 },
    late:          { type: Number, required: true, default: 0 },
    halfDay:       { type: Number, required: true, default: 0 },
    leaveApproved: { type: Number, required: true, default: 0 },
    percent:       { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const aiRemarkSchema = new Schema<IReportCardAiRemark>(
  {
    text:         { type: String, required: true, trim: true, maxlength: 1000 },
    generatedAt:  { type: Date },
    model:        { type: String },
    edited:       { type: Boolean, default: false },
  },
  { _id: false },
);

const reportCardSchema = new Schema<IReportCard>(
  {
    schoolId:          { type: String, required: true, default: 'DEMO_SCHOOL' },
    examId:            { type: String, required: true },
    studentId:         { type: String, required: true },
    class:             { type: String, required: true, trim: true },
    section:           { type: String, required: true, trim: true },
    subjects:          { type: [subjectRowSchema], default: [] },
    coScholastic:      { type: [coScholasticEntrySchema], default: [] },
    summary:           { type: summarySchema, required: true, default: () => ({}) },
    attendance:        { type: attendanceSchema, required: true, default: () => ({}) },
    aiRemark:          { type: aiRemarkSchema },
    teacherRemark:     { type: String, trim: true, maxlength: 1000 },
    principalRemark:   { type: String, trim: true, maxlength: 1000 },
    parentFeedback:    { type: String, trim: true, maxlength: 1000 },
    warnings:          { type: [String], default: [] },
    verificationToken: { type: String, required: true },
    status:            { type: String, enum: ['draft', 'published'], default: 'draft' },
    generatedById:     { type: String, required: true },
    generatedByName:   { type: String, required: true },
    generatedAt:       { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// One report card per student per exam — regenerating updates the same document.
reportCardSchema.index({ schoolId: 1, examId: 1, studentId: 1 }, { unique: true });
reportCardSchema.index({ schoolId: 1, class: 1, section: 1, examId: 1 });
reportCardSchema.index({ verificationToken: 1 }, { unique: true });

export const ReportCard = mongoose.model<IReportCard>('ReportCard', reportCardSchema);
