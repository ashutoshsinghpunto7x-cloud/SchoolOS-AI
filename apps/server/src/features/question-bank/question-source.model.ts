import mongoose, { Document, Schema } from 'mongoose';
import type { ContentBlock, ChapterPage, PageFigure } from '@schoolos/types';

export type QuestionSourceKind = 'image' | 'pdf_text';

/**
 * Permanent record of the raw text an upload converted to, kept separate
 * from ExtractionJob (which auto-expires after 6h and exists only for the
 * upload → poll flow). Lets a teacher re-run AI structuring on a page they
 * already uploaded without re-scanning/re-uploading it.
 *
 * `pages` (layout-aware chapter capture) is optional and additive — plain
 * single-image/PDF uploads via extractFromImage/extractFromPdf never set it,
 * and `extractedText` stays the required, always-present field (derived from
 * `pages` via flattenBlocksToText when present, so downstream consumers like
 * paper-generator's context slicing keep working unchanged either way).
 */
export interface IQuestionSource extends Document {
  schoolId: string;
  userId: string;
  class: string;
  subject: string;
  kind: QuestionSourceKind;
  fileName?: string;
  extractedText: string;
  /** Teacher-assigned chapter for this upload — pre-fills every question drafted from it, overriding the AI's per-question guess. */
  chapterName?: string;
  documentTitle?: string;
  language?: string;
  pages?: ChapterPage[];
  reviewStatus?: 'ready_for_review' | 'saved';
  /** Set only for a single-image upload where the teacher opted into image detection — chapter-capture sources carry the equivalent per-page instead (see pages[].pageImageFileId/figures). GridFS file id — see lib/image-store.ts. */
  pageImageFileId?: string;
  figures?: PageFigure[];
  createdAt: Date;
  updatedAt: Date;
}

const contentBlockSchema = new Schema<ContentBlock>({}, { strict: false, _id: false });

const boundingBoxSchema = new Schema(
  { x: { type: Number, required: true }, y: { type: Number, required: true }, width: { type: Number, required: true }, height: { type: Number, required: true } },
  { _id: false },
);

const figureSchema = new Schema<PageFigure>(
  {
    figureId:         { type: String, required: true },
    pageNumber:       { type: Number, required: true },
    boundingBox:      { type: boundingBoxSchema, required: true },
    figureType:        { type: String, enum: ['decorative', 'content_supporting', 'diagram', 'chart_table', 'map', 'illustration'], required: true },
    caption:           { type: String },
    description:       { type: String, required: true },
    usableForQuestion: { type: Boolean, required: true },
  },
  { _id: false },
);

const chapterPageSchema = new Schema<ChapterPage>(
  {
    pageNumber:      { type: Number, required: true },
    blocks:          { type: [contentBlockSchema], default: [] },
    confidence:      { type: String, enum: ['high', 'review', 'low'] },
    pageError:       { type: String },
    pageImageFileId: { type: String },
    figures:         { type: [figureSchema], default: undefined },
  },
  { _id: false },
);

const questionSourceSchema = new Schema<IQuestionSource>(
  {
    schoolId:        { type: String, required: true },
    userId:          { type: String, required: true },
    class:           { type: String, required: true },
    subject:         { type: String, required: true },
    kind:            { type: String, enum: ['image', 'pdf_text'], required: true },
    fileName:        { type: String },
    extractedText:   { type: String, required: true },
    chapterName:     { type: String },
    documentTitle:   { type: String },
    language:        { type: String },
    pages:           { type: [chapterPageSchema], default: undefined },
    reviewStatus:    { type: String, enum: ['ready_for_review', 'saved'] },
    pageImageFileId: { type: String },
    figures:         { type: [figureSchema], default: undefined },
  },
  { timestamps: true, versionKey: false },
);

questionSourceSchema.index({ schoolId: 1, class: 1, subject: 1, createdAt: -1 });

export const QuestionSource = mongoose.model<IQuestionSource>('QuestionSource', questionSourceSchema);
