import mongoose, { Document, Schema } from 'mongoose';

export interface ILessonPlan extends Document {
  schoolId: string;
  teacherId: string;
  class: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  topic?: string;
  durationMinutes: number;
  objective: string;
  introduction: string;
  explanation: string;
  activities: string[];
  examples: string[];
  questions: string[];
  homework: string;
  assessment: string;
  createdBy: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lessonPlanSchema = new Schema<ILessonPlan>(
  {
    schoolId:        { type: String, required: true, default: 'DEMO_SCHOOL' },
    teacherId:       { type: String, required: true },
    class:           { type: String, required: true, trim: true },
    subject:         { type: String, required: true, trim: true },
    chapterId:       { type: String, required: true },
    chapterName:     { type: String, required: true, trim: true },
    topic:           { type: String, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    objective:       { type: String, required: true },
    introduction:    { type: String, required: true },
    explanation:     { type: String, required: true },
    activities:      { type: [String], default: [] },
    examples:        { type: [String], default: [] },
    questions:       { type: [String], default: [] },
    homework:        { type: String, required: true },
    assessment:      { type: String, required: true },
    createdBy:       { type: String, required: true },
    isDeleted:       { type: Boolean, default: false },
    deletedAt:       { type: Date },
  },
  { timestamps: true, versionKey: false },
);

lessonPlanSchema.index({ schoolId: 1, isDeleted: 1, teacherId: 1, class: 1, subject: 1, createdAt: -1 });
lessonPlanSchema.index({ schoolId: 1, isDeleted: 1, chapterId: 1 });

export const LessonPlan = mongoose.model<ILessonPlan>('LessonPlan', lessonPlanSchema);
