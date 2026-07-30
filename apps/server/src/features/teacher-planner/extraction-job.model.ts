import mongoose, { Document, Schema } from 'mongoose';
import type { PlannerExtractionResult } from './planner-extraction.service';

export type PlannerExtractionJobStatus = 'processing' | 'completed' | 'failed';
export type PlannerExtractionJobKind = 'image' | 'pdf_text';

/** Same background-job pattern as question-bank/extraction-job.model.ts —
 *  kept as its own collection rather than a shared one so each feature's
 *  result type stays its own, matching that feature's own precedent. */
export interface IPlannerExtractionJob extends Document {
  schoolId: string;
  userId: string;
  kind: PlannerExtractionJobKind;
  status: PlannerExtractionJobStatus;
  result?: PlannerExtractionResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const plannerExtractionJobSchema = new Schema<IPlannerExtractionJob>(
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

plannerExtractionJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 6 });
plannerExtractionJobSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });

export const PlannerExtractionJob = mongoose.model<IPlannerExtractionJob>('PlannerExtractionJob', plannerExtractionJobSchema);
