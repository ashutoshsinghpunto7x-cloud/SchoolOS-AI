import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ExamType =
  | 'unit_test'
  | 'monthly_test'
  | 'half_yearly'
  | 'annual'
  | 'practical'
  | 'internal_assessment'
  | 'other';

export type ExamStatus = 'draft' | 'configured' | 'locked';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IExamComponent {
  name: string;          // e.g. 'Theory', 'Practical', 'Oral', 'Notebook', 'Project'
  maxMarks: number;
  passMarks?: number;
  weight?: number;       // used for weighted-total exams; defaults to 1 (equal weight)
}

export interface IGradeBand {
  label: string;         // e.g. 'A+', 'A', 'B'
  minPercent: number;
  maxPercent: number;
}

/** Report-card display type for a subject — independent of how the mark is
 *  computed (computeResult() in marks.service.ts always computes numeric
 *  total/percentage/grade the same way). This only controls whether the
 *  report card shows the number, the letter grade, or both for that subject —
 *  e.g. Maths/English show marks, Art/Music show only a grade. */
export type SubjectEvaluationType = 'marks' | 'grade' | 'both';

export interface ISubjectConfig {
  name: string;
  evaluationType: SubjectEvaluationType;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IExam extends Document {
  schoolId: string;
  name: string;
  examType: ExamType;
  termLabel?: string;              // e.g. 'Term 1', 'Annual 2026'
  classesApplicable: string[];     // e.g. ['10A', '10B']
  subjects: string[];              // subject names this exam covers (free text, matches Teacher.subjects)
  /** Per-subject report-card display config. Optional and additive — a subject
   *  present in `subjects` but missing here defaults to evaluationType 'marks'
   *  (see resolveSubjectEvaluationType in report-cards/report-card.service.ts). */
  subjectConfigs?: ISubjectConfig[];
  components: IExamComponent[];
  gradingBands: IGradeBand[];
  passPercent: number;             // overall min percent to pass
  subjectWiseMinPercent?: number;  // if set, each subject must individually clear this to pass overall
  status: ExamStatus;
  // Audit
  createdBy?: string;
  updatedBy?: string;
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const examComponentSchema = new Schema<IExamComponent>(
  {
    name:       { type: String, required: true, trim: true },
    maxMarks:   { type: Number, required: true, min: 0 },
    passMarks:  { type: Number, min: 0 },
    weight:     { type: Number, min: 0, default: 1 },
  },
  { _id: false }
);

const gradeBandSchema = new Schema<IGradeBand>(
  {
    label:      { type: String, required: true, trim: true },
    minPercent: { type: Number, required: true, min: 0, max: 100 },
    maxPercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const subjectConfigSchema = new Schema<ISubjectConfig>(
  {
    name:           { type: String, required: true, trim: true },
    evaluationType: { type: String, enum: ['marks', 'grade', 'both'], default: 'marks' },
  },
  { _id: false }
);

const EXAM_TYPES: ExamType[] = [
  'unit_test', 'monthly_test', 'half_yearly', 'annual', 'practical', 'internal_assessment', 'other',
];

const EXAM_STATUSES: ExamStatus[] = ['draft', 'configured', 'locked'];

const examSchema = new Schema<IExam>(
  {
    schoolId:              { type: String, required: true, default: 'DEMO_SCHOOL' },
    name:                  { type: String, required: true, trim: true },
    examType:              { type: String, enum: EXAM_TYPES, required: true },
    termLabel:             { type: String, trim: true },
    classesApplicable:     { type: [String], default: [] },
    subjects:              { type: [String], default: [] },
    subjectConfigs:        { type: [subjectConfigSchema], default: [] },
    components:            { type: [examComponentSchema], default: [] },
    gradingBands:          { type: [gradeBandSchema], default: [] },
    passPercent:           { type: Number, required: true, min: 0, max: 100, default: 33 },
    subjectWiseMinPercent: { type: Number, min: 0, max: 100 },
    status:                { type: String, enum: EXAM_STATUSES, default: 'draft' },
    createdBy:             { type: String },
    updatedBy:             { type: String },
    isDeleted:             { type: Boolean, default: false },
    deletedAt:             { type: Date },
    deletedBy:             { type: String },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

examSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
examSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
examSchema.index({ schoolId: 1, isDeleted: 1, classesApplicable: 1 });
examSchema.index({ schoolId: 1, isDeleted: 1, examType: 1 });

export const Exam = mongoose.model<IExam>('Exam', examSchema);
