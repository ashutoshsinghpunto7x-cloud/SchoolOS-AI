import mongoose, { Document, Schema } from 'mongoose';
import { SubjectEvaluationType } from '../exams/exam.model';
import { ResultStatus } from '../marks/marks.model';
import { PromotionStatus } from '../report-cards/report-card.model';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type TermReportCardStatus = 'draft' | 'published';
export type SkillGrade = 'A' | 'B' | 'C' | 'D';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface ITermSubjectRow {
  subjectId: string;
  subjectName: string;
  evaluationType: SubjectEvaluationType;
  unitTestMaxMarks: number;
  mainExamMaxMarks: number;
  unitTest1Score?: number;
  unitTest2Score?: number;
  bestUnitTestScore?: number;
  mainExamScore?: number;
  termTotal?: number;
  termMaxMarks: number;
  grade?: string;
  result: ResultStatus;
}

export interface ITermAttendance {
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leaveApproved: number;
  percent: number;
}

export interface ITermBlock {
  unitTest1ExamId?: string;
  unitTest2ExamId?: string;
  mainExamId?: string;
  subjectRows: ITermSubjectRow[];
  attendance: ITermAttendance;
  termTotalObtained: number;
  termTotalMax: number;
  termPercentage: number;
  /** This term's own class rank/size — distinct from the overall `summary.rank`
   *  across both terms, computed from classmates' totals for just this term. */
  rank?: number;
  classSize?: number;
}

export interface ITermReportCardSkillEntry {
  sectionId: string;
  sectionName: string;
  rowId: string;
  rowLabel: string;
  firstTermGrade?: SkillGrade;
  finalTermGrade?: SkillGrade;
}

export interface ITermReportCardSummary {
  rank?: number;
  classSize?: number;
  promotionStatus: PromotionStatus;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface ITermReportCard extends Document {
  schoolId: string;
  studentId: string;
  class: string;
  section: string;
  academicYear: string;
  templateId: string;
  firstTerm: ITermBlock;
  finalTerm: ITermBlock;
  grandTotalObtained: number;
  grandTotalMax: number;
  grandAveragePercent: number;
  overallGrade?: string;
  skills: ITermReportCardSkillEntry[];
  summary: ITermReportCardSummary;
  teacherRemark?: string;
  principalRemark?: string;
  parentFeedback?: string;
  warnings: string[];
  verificationToken: string;
  status: TermReportCardStatus;
  generatedById: string;
  generatedByName: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const termSubjectRowSchema = new Schema<ITermSubjectRow>(
  {
    subjectId:         { type: String, required: true },
    subjectName:       { type: String, required: true, trim: true },
    evaluationType:    { type: String, enum: ['marks', 'grade', 'both'], default: 'marks' },
    unitTestMaxMarks:  { type: Number, required: true, min: 0 },
    mainExamMaxMarks:  { type: Number, required: true, min: 0 },
    unitTest1Score:    { type: Number, min: 0 },
    unitTest2Score:    { type: Number, min: 0 },
    bestUnitTestScore: { type: Number, min: 0 },
    mainExamScore:     { type: Number, min: 0 },
    termTotal:         { type: Number, min: 0 },
    termMaxMarks:      { type: Number, required: true, min: 0 },
    grade:             { type: String, trim: true },
    result:            { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
  },
  { _id: false },
);

const termAttendanceSchema = new Schema<ITermAttendance>(
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

const termBlockSchema = new Schema<ITermBlock>(
  {
    unitTest1ExamId:   { type: String },
    unitTest2ExamId:   { type: String },
    mainExamId:        { type: String },
    subjectRows:       { type: [termSubjectRowSchema], default: [] },
    attendance:        { type: termAttendanceSchema, required: true, default: () => ({}) },
    termTotalObtained: { type: Number, required: true, default: 0 },
    termTotalMax:      { type: Number, required: true, default: 0 },
    termPercentage:    { type: Number, required: true, default: 0 },
    rank:              { type: Number, min: 1 },
    classSize:         { type: Number, min: 0 },
  },
  { _id: false },
);

const skillEntrySchema = new Schema<ITermReportCardSkillEntry>(
  {
    sectionId:      { type: String, required: true },
    sectionName:    { type: String, required: true, trim: true },
    rowId:          { type: String, required: true },
    rowLabel:       { type: String, required: true, trim: true },
    firstTermGrade: { type: String, enum: ['A', 'B', 'C', 'D'] },
    finalTermGrade: { type: String, enum: ['A', 'B', 'C', 'D'] },
  },
  { _id: false },
);

const summarySchema = new Schema<ITermReportCardSummary>(
  {
    rank:            { type: Number, min: 1 },
    classSize:       { type: Number, min: 0 },
    promotionStatus: { type: String, enum: ['promoted', 'not_promoted', 'pending'], default: 'pending' },
  },
  { _id: false },
);

const termReportCardSchema = new Schema<ITermReportCard>(
  {
    schoolId:            { type: String, required: true, default: 'DEMO_SCHOOL' },
    studentId:           { type: String, required: true },
    class:               { type: String, required: true, trim: true },
    section:             { type: String, required: true, trim: true },
    academicYear:        { type: String, required: true, trim: true },
    templateId:          { type: String, required: true },
    firstTerm:           { type: termBlockSchema, required: true, default: () => ({}) },
    finalTerm:           { type: termBlockSchema, required: true, default: () => ({}) },
    grandTotalObtained:  { type: Number, required: true, default: 0 },
    grandTotalMax:       { type: Number, required: true, default: 0 },
    grandAveragePercent: { type: Number, required: true, default: 0 },
    overallGrade:        { type: String, trim: true },
    skills:              { type: [skillEntrySchema], default: [] },
    summary:             { type: summarySchema, required: true, default: () => ({}) },
    teacherRemark:       { type: String, trim: true, maxlength: 1000 },
    principalRemark:     { type: String, trim: true, maxlength: 1000 },
    parentFeedback:      { type: String, trim: true, maxlength: 1000 },
    warnings:            { type: [String], default: [] },
    verificationToken:   { type: String, required: true },
    status:              { type: String, enum: ['draft', 'published'], default: 'draft' },
    generatedById:       { type: String, required: true },
    generatedByName:     { type: String, required: true },
    generatedAt:         { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// One term report card per student per academic year — regenerating updates the same document.
termReportCardSchema.index({ schoolId: 1, studentId: 1, academicYear: 1 }, { unique: true });
termReportCardSchema.index({ schoolId: 1, class: 1, section: 1, academicYear: 1 });
termReportCardSchema.index({ verificationToken: 1 }, { unique: true });

export const TermReportCard = mongoose.model<ITermReportCard>('TermReportCard', termReportCardSchema);
