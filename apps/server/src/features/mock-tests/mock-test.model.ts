import mongoose, { Document, Schema, Types } from 'mongoose';

// Ops-authored MCQ mock tests — see project spec "Online Mock Test Engine".
// Authored entirely by the internal ops/dev team via Ops Center from
// already-captured Question Bank chapter text, never by school teachers.
// v1 is MCQ-only, auto-graded.

export type MockTestStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'live' | 'closed';
export type MockTestMode = 'anonymous' | 'ranked';

const MOCK_TEST_STATUSES: MockTestStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'live', 'closed'];
const MOCK_TEST_MODES: MockTestMode[] = ['anonymous', 'ranked'];

export interface IMockTestQuestion {
  _id: Types.ObjectId;
  questionText: string;
  options: string[];
  /** Index into `options` — never sent to the parent/student client (see mock-test.service's stripAnswers). */
  correctOptionIndex: number;
  marks: number;
}

export interface IMockTest extends Document {
  schoolId: string;
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  title: string;
  questions: IMockTestQuestion[];
  durationMinutes: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  mode: MockTestMode;
  status: MockTestStatus;
  createdBy: string;
  submittedForApprovalAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  anonymousSubmissionCount: number;
  anonymousAverageScorePercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IMockTestQuestion>(
  {
    questionText: { type: String, required: true, trim: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true, min: 0 },
    marks: { type: Number, required: true, min: 0, default: 1 },
  },
  { timestamps: false },
);

const mockTestSchema = new Schema<IMockTest>(
  {
    schoolId:     { type: String, required: true },
    class:        { type: String, required: true, trim: true },
    subject:      { type: String, required: true, trim: true },
    chapterIds:   { type: [String], default: [] },
    chapterNames: { type: [String], default: [] },
    title:        { type: String, required: true, trim: true },
    questions:    { type: [questionSchema], default: [] },
    durationMinutes: { type: Number, required: true, default: 30, min: 1 },
    scheduledStart:  { type: Date, required: true },
    scheduledEnd:    { type: Date, required: true },
    mode:            { type: String, enum: MOCK_TEST_MODES, required: true, default: 'anonymous' },
    status:          { type: String, enum: MOCK_TEST_STATUSES, required: true, default: 'draft' },
    createdBy:       { type: String, required: true },
    submittedForApprovalAt: { type: Date },
    approvedBy:   { type: String },
    approvedAt:   { type: Date },
    rejectedBy:   { type: String },
    rejectedAt:   { type: Date },
    rejectionReason: { type: String },
    anonymousSubmissionCount: { type: Number, default: 0 },
    anonymousAverageScorePercent: { type: Number },
  },
  { timestamps: true, versionKey: false },
);

mockTestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
mockTestSchema.index({ schoolId: 1, class: 1, status: 1 });
// Scheduler queries: "everything approved whose start has arrived" / "everything live whose end has arrived".
mockTestSchema.index({ status: 1, scheduledStart: 1 });
mockTestSchema.index({ status: 1, scheduledEnd: 1 });

export const MockTest = mongoose.model<IMockTest>('MockTest', mockTestSchema);
