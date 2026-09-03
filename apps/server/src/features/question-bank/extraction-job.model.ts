import mongoose, { Document, Schema } from 'mongoose';
import type { QuestionExtractionResult, TextExtractionResult } from './question-extraction.service';
import type { ChapterCaptureJobResult } from '@schoolos/types';

export type ExtractionJobStatus = 'processing' | 'completed' | 'failed';
export type ExtractionJobKind = 'image' | 'pdf_text' | 'chapter_capture';

/**
 * Same in-process background-job pattern as marks/ai-extraction-job.model.ts
 * (enqueue → poll GET .../jobs/:id) — kept as its own collection rather than
 * extending the marks job model, since that one's `result` type is pinned to
 * MarksExtractionResult and touching it would ripple into an unrelated feature.
 *
 * `kind: 'chapter_capture'` covers the multi-page structured-OCR batch flow:
 * `totalPages`/`completedPages` track progress while pages are still being
 * processed (client polls this to render a progress bar), and `result` holds
 * the per-page structured blocks once done. Nothing is written to
 * QuestionSource until the teacher reviews and explicitly saves — this job
 * document (and the raw images the client held to produce it) are the only
 * "temporary" state, and it auto-expires via the TTL index below either way.
 */
export interface IExtractionJob extends Document {
  schoolId: string;
  userId: string;
  kind: ExtractionJobKind;
  status: ExtractionJobStatus;
  totalPages?: number;
  completedPages?: number;
  result?: QuestionExtractionResult | TextExtractionResult | ChapterCaptureJobResult;
  error?: string;
  // Only set for kind:'chapter_capture' — each page's vision call now needs the class/subject to
  // draft grade-appropriate questions (not just transcribe), so retryPage needs them too without
  // the client having to resend what it already sent once at /extract/chapter time.
  class?: string;
  subject?: string;
  chapterName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const extractionJobSchema = new Schema<IExtractionJob>(
  {
    schoolId:       { type: String, required: true },
    userId:         { type: String, required: true },
    kind:           { type: String, enum: ['image', 'pdf_text', 'chapter_capture'], required: true },
    status:         { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    totalPages:     { type: Number },
    completedPages: { type: Number, default: 0 },
    result:         { type: Schema.Types.Mixed },
    error:          { type: String },
    class:          { type: String },
    subject:        { type: String },
    chapterName:    { type: String },
  },
  { timestamps: true, versionKey: false },
);

extractionJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 6 });
extractionJobSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });

export const ExtractionJob = mongoose.model<IExtractionJob>('ExtractionJob', extractionJobSchema);
