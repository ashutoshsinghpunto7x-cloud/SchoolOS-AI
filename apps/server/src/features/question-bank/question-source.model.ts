import mongoose, { Document, Schema } from 'mongoose';

export type QuestionSourceKind = 'image' | 'pdf_text';

/**
 * Permanent record of the raw text an upload converted to, kept separate
 * from ExtractionJob (which auto-expires after 6h and exists only for the
 * upload → poll flow). Lets a teacher re-run AI structuring on a page they
 * already uploaded without re-scanning/re-uploading it.
 */
export interface IQuestionSource extends Document {
  schoolId: string;
  userId: string;
  class: string;
  subject: string;
  kind: QuestionSourceKind;
  fileName?: string;
  extractedText: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionSourceSchema = new Schema<IQuestionSource>(
  {
    schoolId:      { type: String, required: true },
    userId:        { type: String, required: true },
    class:         { type: String, required: true },
    subject:       { type: String, required: true },
    kind:          { type: String, enum: ['image', 'pdf_text'], required: true },
    fileName:      { type: String },
    extractedText: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

questionSourceSchema.index({ schoolId: 1, class: 1, subject: 1, createdAt: -1 });

export const QuestionSource = mongoose.model<IQuestionSource>('QuestionSource', questionSourceSchema);
