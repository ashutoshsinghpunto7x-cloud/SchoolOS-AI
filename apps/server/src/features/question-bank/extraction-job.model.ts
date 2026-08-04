import mongoose, { Document, Schema } from 'mongoose';
import type { QuestionExtractionResult, TextExtractionResult } from './question-extraction.service';

export type ExtractionJobStatus = 'processing' | 'completed' | 'failed';
export type ExtractionJobKind = 'image' | 'pdf_text';

/**
 * Same in-process background-job pattern as marks/ai-extraction-job.model.ts
 * (enqueue → poll GET .../jobs/:id) — kept as its own collection rather than
 * extending the marks job model, since that one's `result` type is pinned to
 * MarksExtractionResult and touching it would ripple into an unrelated feature.
 */
export interface IExtractionJob extends Document {
  schoolId: string;
  userId: string;
  kind: ExtractionJobKind;
  status: ExtractionJobStatus;
  result?: QuestionExtractionResult | TextExtractionResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const extractionJobSchema = new Schema<IExtractionJob>(
  {
    schoolId: { type: String, required: true },
    userId:   { type: String, required: true },
    kind:     { type: String, enum: ['image', 'pdf_text'], required: true },
    status:   { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    result:   { type: Schema.Types.Mixed },
    error:    { type: String },
  },
  { timestamps: true, versionKey: false },
);

extractionJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 6 });
extractionJobSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });

export const ExtractionJob = mongoose.model<IExtractionJob>('ExtractionJob', extractionJobSchema);
