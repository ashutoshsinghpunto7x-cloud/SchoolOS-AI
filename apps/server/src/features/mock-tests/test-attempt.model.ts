import mongoose, { Document, Schema } from 'mongoose';

// Ranked-mode only — anonymous-mode submissions never create a document here
// (see mock-test.service.submit). One attempt per student per test.

export interface ITestAttemptAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

export interface ITestAttempt extends Document {
  schoolId: string;
  testId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  answers: ITestAttemptAnswer[];
  score: number;
  totalMarks: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<ITestAttemptAnswer>(
  { questionId: { type: String, required: true }, selectedOptionIndex: { type: Number, required: true } },
  { _id: false },
);

const testAttemptSchema = new Schema<ITestAttempt>(
  {
    schoolId:  { type: String, required: true },
    testId:    { type: String, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    class:     { type: String, required: true },
    section:   { type: String, required: true },
    answers:   { type: [answerSchema], default: [] },
    score:            { type: Number, required: true },
    totalMarks:       { type: Number, required: true },
    correctCount:     { type: Number, required: true },
    totalQuestions:   { type: Number, required: true },
    submittedAt:      { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, versionKey: false },
);

// One attempt per student per test — also the lookup the submit endpoint uses to reject a resubmission.
testAttemptSchema.index({ schoolId: 1, testId: 1, studentId: 1 }, { unique: true });
testAttemptSchema.index({ schoolId: 1, testId: 1, score: -1, submittedAt: 1 });

export const TestAttempt = mongoose.model<ITestAttempt>('TestAttempt', testAttemptSchema);
