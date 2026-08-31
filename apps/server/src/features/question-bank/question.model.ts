import mongoose, { Document, Schema } from 'mongoose';

export type QuestionType =
  | 'mcq'
  | 'fill_blank'
  | 'true_false'
  | 'assertion_reason'
  | 'very_short'
  | 'short'
  | 'long'
  | 'hots'
  | 'case_study';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface IQuestionUsageEntry {
  examId?: string;
  usedAt: Date;
}

export interface IQuestionSourceRef {
  sourceId: string;
  pageNumber?: number;
  blockIndex?: number;
}

export interface IQuestionImageRef {
  sourceId: string;
  figureId: string;
}

export interface IQuestionImageRequirement {
  imageRequired: true;
  imageSource: 'generated' | 'teacher_upload';
  imagePrompt?: string;
}

export interface IQuestion extends Document {
  schoolId: string;
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  topic?: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  estimatedTimeMinutes: number;
  bloomsLevel: BloomsLevel;
  keywords: string[];
  source?: string;
  usageHistory: IQuestionUsageEntry[];
  createdBy: string;
  isDeleted: boolean;
  deletedAt?: Date;
  /** Traceability back to the structured chapter capture this question was drafted from, if any — powers "Show source". */
  sourceRef?: IQuestionSourceRef;
  imageRef?: IQuestionImageRef;
  imageRequirement?: IQuestionImageRequirement;
  createdAt: Date;
  updatedAt: Date;
}

const QUESTION_TYPES: QuestionType[] = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const BLOOMS_LEVELS: BloomsLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const usageEntrySchema = new Schema<IQuestionUsageEntry>(
  { examId: { type: String }, usedAt: { type: Date, required: true } },
  { _id: false },
);

const sourceRefSchema = new Schema<IQuestionSourceRef>(
  { sourceId: { type: String, required: true }, pageNumber: { type: Number }, blockIndex: { type: Number } },
  { _id: false },
);

export const imageRefSchema = new Schema<IQuestionImageRef>(
  { sourceId: { type: String, required: true }, figureId: { type: String, required: true } },
  { _id: false },
);

export const imageRequirementSchema = new Schema<IQuestionImageRequirement>(
  {
    imageRequired: { type: Boolean, required: true },
    imageSource:   { type: String, enum: ['generated', 'teacher_upload'], required: true },
    imagePrompt:   { type: String },
  },
  { _id: false },
);

const questionSchema = new Schema<IQuestion>(
  {
    schoolId:             { type: String, required: true, default: 'DEMO_SCHOOL' },
    class:                { type: String, required: true, trim: true },
    subject:              { type: String, required: true, trim: true },
    chapterId:            { type: String, required: true },
    chapterName:          { type: String, required: true, trim: true },
    topic:                { type: String, trim: true },
    questionText:         { type: String, required: true, trim: true },
    questionType:         { type: String, enum: QUESTION_TYPES, required: true },
    options:              { type: [String] },
    correctAnswer:        { type: String, trim: true },
    difficulty:           { type: String, enum: DIFFICULTIES, required: true },
    marks:                { type: Number, required: true, min: 0 },
    estimatedTimeMinutes: { type: Number, required: true, min: 0 },
    bloomsLevel:          { type: String, enum: BLOOMS_LEVELS, required: true },
    keywords:             { type: [String], default: [] },
    source:               { type: String, trim: true },
    usageHistory:         { type: [usageEntrySchema], default: [] },
    createdBy:            { type: String, required: true },
    isDeleted:            { type: Boolean, default: false },
    deletedAt:            { type: Date },
    sourceRef:            { type: sourceRefSchema },
    imageRef:             { type: imageRefSchema },
    imageRequirement:     { type: imageRequirementSchema },
  },
  { timestamps: true, versionKey: false },
);

questionSchema.index({ schoolId: 1, isDeleted: 1, class: 1, subject: 1 });
questionSchema.index({ schoolId: 1, isDeleted: 1, chapterId: 1 });
questionSchema.index({ schoolId: 1, isDeleted: 1, difficulty: 1 });
questionSchema.index({ schoolId: 1, isDeleted: 1, questionType: 1 });
questionSchema.index({ questionText: 'text', keywords: 'text', topic: 'text' });

export const Question = mongoose.model<IQuestion>('Question', questionSchema);
