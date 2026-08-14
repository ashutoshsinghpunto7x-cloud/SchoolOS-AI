import mongoose, { Document, Schema } from 'mongoose';

// Server-authoritative usage accounting — recorded here, never computed from
// frontend state, so Ops Center numbers can't be manipulated from the browser
// (see aiUsageRepository.record in features/ai/ai.repository.ts for the same
// fire-and-forget pattern, used for token/cost accounting specifically; this
// is the feature-level request/document/word counterpart). Lives in lib/
// rather than a single feature folder since Ops Center and any future
// feature both read/write it.

export type UsageEventFeature = 'chapter-capture';
export type UsageEventAction = 'capture_started' | 'page_processed' | 'chapter_saved' | 'question_generated' | 'paper_generated';
export type UsageEventStatus = 'success' | 'failed';

export interface IUsageEvent extends Document {
  userId: string;
  schoolId: string;
  feature: UsageEventFeature;
  action: UsageEventAction;
  documentId?: string;
  pagesProcessed?: number;
  wordsGenerated?: number;
  processingTimeMs?: number;
  status: UsageEventStatus;
  createdAt: Date;
}

const usageEventSchema = new Schema<IUsageEvent>(
  {
    userId:           { type: String, required: true },
    schoolId:         { type: String, required: true },
    feature:          { type: String, required: true },
    action:           { type: String, required: true },
    documentId:       { type: String },
    pagesProcessed:   { type: Number },
    wordsGenerated:   { type: Number },
    processingTimeMs: { type: Number },
    status:           { type: String, enum: ['success', 'failed'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

usageEventSchema.index({ schoolId: 1, feature: 1, createdAt: -1 });
usageEventSchema.index({ userId: 1, createdAt: -1 });

export const UsageEvent = mongoose.model<IUsageEvent>('UsageEvent', usageEventSchema);
