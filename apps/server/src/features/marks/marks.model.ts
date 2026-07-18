import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ComponentStatus = 'present' | 'absent' | 'exempt' | 'medical' | 'not_assessed';

export type MarksWorkflowStatus =
  | 'draft'
  | 'submitted'
  | 'needs_correction'
  | 'approved'
  | 'published'
  | 'locked'
  | 'reopened';

export type ResultStatus = 'pass' | 'fail' | 'na';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IComponentScore {
  componentName: string;
  score?: number;
  status: ComponentStatus;
}

export interface IMarksAuditEntry {
  action: string;
  byUserId: string;
  byName: string;
  reason?: string;
  fromValue?: string;
  toValue?: string;
  at: Date;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IMarks extends Document {
  schoolId: string;
  examId: string;
  studentId: string;
  class: string;
  section: string;
  subjectName: string;
  componentScores: IComponentScore[];
  total?: number;
  percentage?: number;
  grade?: string;
  result: ResultStatus;
  remark?: string;
  workflowStatus: MarksWorkflowStatus;
  // Who did what
  enteredById: string;
  enteredByName: string;
  enteredAt: Date;
  lastEditedById?: string;
  lastEditedByName?: string;
  lastEditedAt?: Date;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: Date;
  publishedById?: string;
  publishedByName?: string;
  publishedAt?: Date;
  auditTrail: IMarksAuditEntry[];
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const COMPONENT_STATUSES: ComponentStatus[] = ['present', 'absent', 'exempt', 'medical', 'not_assessed'];
const WORKFLOW_STATUSES: MarksWorkflowStatus[] = [
  'draft', 'submitted', 'needs_correction', 'approved', 'published', 'locked', 'reopened',
];
const RESULT_STATUSES: ResultStatus[] = ['pass', 'fail', 'na'];

const componentScoreSchema = new Schema<IComponentScore>(
  {
    componentName: { type: String, required: true, trim: true },
    score:         { type: Number, min: 0 },
    status:        { type: String, enum: COMPONENT_STATUSES, default: 'present' },
  },
  { _id: false }
);

const marksAuditEntrySchema = new Schema<IMarksAuditEntry>(
  {
    action:    { type: String, required: true },
    byUserId:  { type: String, required: true },
    byName:    { type: String, required: true },
    reason:    { type: String, trim: true, maxlength: 500 },
    fromValue: { type: String },
    toValue:   { type: String },
    at:        { type: Date, required: true },
  },
  { _id: false }
);

const marksSchema = new Schema<IMarks>(
  {
    schoolId:         { type: String, required: true, default: 'DEMO_SCHOOL' },
    examId:           { type: String, required: true },
    studentId:        { type: String, required: true },
    class:            { type: String, required: true, trim: true },
    section:          { type: String, required: true, trim: true },
    subjectName:      { type: String, required: true, trim: true },
    componentScores:  { type: [componentScoreSchema], default: [] },
    total:            { type: Number, min: 0 },
    percentage:       { type: Number, min: 0, max: 100 },
    grade:            { type: String, trim: true },
    result:           { type: String, enum: RESULT_STATUSES, default: 'na' },
    remark:           { type: String, trim: true, maxlength: 500 },
    workflowStatus:   { type: String, enum: WORKFLOW_STATUSES, default: 'draft' },
    enteredById:      { type: String, required: true },
    enteredByName:    { type: String, required: true },
    enteredAt:        { type: Date, required: true },
    lastEditedById:   { type: String },
    lastEditedByName: { type: String },
    lastEditedAt:     { type: Date },
    approvedById:     { type: String },
    approvedByName:   { type: String },
    approvedAt:       { type: Date },
    publishedById:    { type: String },
    publishedByName:  { type: String },
    publishedAt:      { type: Date },
    auditTrail:       { type: [marksAuditEntrySchema], default: [] },
    isDeleted:        { type: Boolean, default: false },
    deletedAt:        { type: Date },
    deletedBy:        { type: String },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Primary entry-table query: one subject's marks for a whole class+section+exam
marksSchema.index({ schoolId: 1, examId: 1, class: 1, section: 1, subjectName: 1, isDeleted: 1 });
// Student report-card lookup: all subjects for one student in one exam
marksSchema.index({ schoolId: 1, examId: 1, studentId: 1, isDeleted: 1 });
// Unique: one mark record per student per subject per exam (prevents duplicate submissions)
marksSchema.index(
  { schoolId: 1, examId: 1, studentId: 1, subjectName: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
// Review/publish queues filtered by workflow status
marksSchema.index({ schoolId: 1, examId: 1, class: 1, section: 1, subjectName: 1, workflowStatus: 1 });

export const Marks = mongoose.model<IMarks>('Marks', marksSchema);
