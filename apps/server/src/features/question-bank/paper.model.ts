import mongoose, { Document, Schema } from 'mongoose';
import { PaperGenerationConfig, GeneratedPaperSection, PaperValidationResult } from '@schoolos/types';

export interface IGeneratedPaper extends Document {
  schoolId: string;
  config: PaperGenerationConfig;
  questionIds: string[];         // flat list, in section order — sections are rebuilt from this + config on read
  /** Actual question count per entry of `config.sections`, in the same order — only set for section-based papers. Needed to re-slice `questionIds` back into sections on read, since the assembled count can fall short of the requested `count` if the bank/AI couldn't fully fill a section. */
  sectionSizes?: number[];
  totalMarksAssembled: number;
  validation: PaperValidationResult;
  createdBy: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const generatedPaperSchema = new Schema<IGeneratedPaper>(
  {
    schoolId:            { type: String, required: true, default: 'DEMO_SCHOOL' },
    config:               { type: Schema.Types.Mixed, required: true },
    questionIds:          { type: [String], default: [] },
    sectionSizes:         { type: [Number] },
    totalMarksAssembled:  { type: Number, required: true },
    validation:           { type: Schema.Types.Mixed, required: true },
    createdBy:            { type: String, required: true },
    isDeleted:            { type: Boolean, default: false },
    deletedAt:            { type: Date },
  },
  { timestamps: true, versionKey: false },
);

generatedPaperSchema.index({ schoolId: 1, createdAt: -1 });
generatedPaperSchema.index({ schoolId: 1, isDeleted: 1, 'config.class': 1, 'config.subject': 1, createdAt: -1 });

export const GeneratedPaperModel = mongoose.model<IGeneratedPaper>('GeneratedPaper', generatedPaperSchema);
export type { GeneratedPaperSection };
