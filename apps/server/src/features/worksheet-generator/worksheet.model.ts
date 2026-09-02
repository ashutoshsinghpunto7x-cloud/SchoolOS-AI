import mongoose, { Document, Schema } from 'mongoose';
import { QuestionType, QuestionDifficulty, IQuestionImageRef, IQuestionImageRequirement, imageRefSchema, imageRequirementSchema } from '../question-bank/question.model';

export type WorksheetType = 'practice' | 'homework' | 'revision' | 'hots' | 'olympiad' | 'remedial';

export interface IWorksheetQuestion {
  questionId?: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  difficulty: QuestionDifficulty;
  estimatedTimeMinutes: number;
  keywords: string[];
  imageRef?: IQuestionImageRef;
  imageRequirement?: IQuestionImageRequirement;
}

export interface IWorksheet extends Document {
  schoolId: string;
  teacherId: string;
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  worksheetType: WorksheetType;
  title: string;
  questions: IWorksheetQuestion[];
  createdBy: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WORKSHEET_TYPES: WorksheetType[] = ['practice', 'homework', 'revision', 'hots', 'olympiad', 'remedial'];
const QUESTION_TYPES: QuestionType[] = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

const worksheetQuestionSchema = new Schema<IWorksheetQuestion>(
  {
    questionId:           { type: String },
    questionText:         { type: String, required: true, trim: true },
    questionType:         { type: String, enum: QUESTION_TYPES, required: true },
    options:              { type: [String] },
    difficulty:           { type: String, enum: DIFFICULTIES, required: true },
    estimatedTimeMinutes: { type: Number, required: true, min: 0 },
    keywords:             { type: [String], default: [] },
    imageRef:             { type: imageRefSchema },
    imageRequirement:     { type: imageRequirementSchema },
  },
  { _id: false },
);

const worksheetSchema = new Schema<IWorksheet>(
  {
    schoolId:      { type: String, required: true, default: 'DEMO_SCHOOL' },
    teacherId:     { type: String, required: true },
    class:         { type: String, required: true, trim: true },
    subject:       { type: String, required: true, trim: true },
    chapterIds:    { type: [String], default: [] },
    chapterNames:  { type: [String], default: [] },
    worksheetType: { type: String, enum: WORKSHEET_TYPES, required: true },
    title:         { type: String, required: true, trim: true },
    questions:     { type: [worksheetQuestionSchema], default: [] },
    createdBy:     { type: String, required: true },
    isDeleted:     { type: Boolean, default: false },
    deletedAt:     { type: Date },
  },
  { timestamps: true, versionKey: false },
);

worksheetSchema.index({ schoolId: 1, isDeleted: 1, teacherId: 1, class: 1, subject: 1, createdAt: -1 });
worksheetSchema.index({ schoolId: 1, isDeleted: 1, worksheetType: 1 });

export const Worksheet = mongoose.model<IWorksheet>('Worksheet', worksheetSchema);
