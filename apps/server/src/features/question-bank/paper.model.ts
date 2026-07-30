import mongoose, { Document, Schema } from 'mongoose';
import { PaperGenerationConfig, GeneratedPaperSection, PaperValidationResult } from '@schoolos/types';

export interface IGeneratedPaper extends Document {
  schoolId: string;
  config: PaperGenerationConfig;
  questionIds: string[];         // flat list, in section order — sections are rebuilt from this + config on read
  totalMarksAssembled: number;
  validation: PaperValidationResult;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const generatedPaperSchema = new Schema<IGeneratedPaper>(
  {
    schoolId:            { type: String, required: true, default: 'DEMO_SCHOOL' },
    config:               { type: Schema.Types.Mixed, required: true },
    questionIds:          { type: [String], default: [] },
    totalMarksAssembled:  { type: Number, required: true },
    validation:           { type: Schema.Types.Mixed, required: true },
    createdBy:            { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

generatedPaperSchema.index({ schoolId: 1, createdAt: -1 });

export const GeneratedPaperModel = mongoose.model<IGeneratedPaper>('GeneratedPaper', generatedPaperSchema);
export type { GeneratedPaperSection };
