import mongoose, { Document, Schema } from 'mongoose';
import type { MarksExtractionResult } from './marks-extraction.service';

export type AiExtractionJobStatus = 'processing' | 'completed' | 'failed';
export type AiExtractionJobKind = 'image' | 'voice';

/**
 * Tracks one AI marks-extraction request (photo or voice note) processed in
 * the background instead of inline in the request handler — the slowest of
 * these (voice: Whisper transcription then GPT) can take up to ~60s, which
 * either ties up an HTTP request for that whole time or risks a platform
 * request-timeout. The client gets this job's id back immediately and polls
 * GET /marks/extract/jobs/:id for the result.
 *
 * Same in-process pattern as communication/bulk-send-job.model.ts (no
 * Redis/BullMQ in this codebase) — a job left PROCESSING on a mid-run
 * restart is a known, accepted limitation of that pattern here, not new.
 */
export interface IAiExtractionJob extends Document {
  schoolId: string;
  userId: string;
  kind: AiExtractionJobKind;
  status: AiExtractionJobStatus;
  result?: MarksExtractionResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiExtractionJobSchema = new Schema<IAiExtractionJob>(
  {
    schoolId: { type: String, required: true },
    userId:   { type: String, required: true },
    kind:     { type: String, enum: ['image', 'voice'], required: true },
    status:   { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    result:   { type: Schema.Types.Mixed },
    error:    { type: String },
  },
  { timestamps: true, versionKey: false },
);

// TTL — these are ephemeral polling handles, not records worth keeping; expire
// well after any plausible client would still be polling.
aiExtractionJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 6 });
aiExtractionJobSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });

export const AiExtractionJob = mongoose.model<IAiExtractionJob>('AiExtractionJob', aiExtractionJobSchema);
