import mongoose, { Document, Schema } from 'mongoose';

// Auto-derived from AI extraction (no manual pre-setup required) — a teacher
// uploading a textbook page/PDF gets its chapter matched against existing
// rows for that class+subject (fuzzy name match, see question-extraction.service.ts),
// or a new one created on the fly. Teachers can rename/merge afterward.

export interface ISyllabusChapter extends Document {
  schoolId: string;
  class: string;
  subject: string;
  chapterName: string;
  topics: string[];
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const syllabusChapterSchema = new Schema<ISyllabusChapter>(
  {
    schoolId:    { type: String, required: true, default: 'DEMO_SCHOOL' },
    class:       { type: String, required: true, trim: true },
    subject:     { type: String, required: true, trim: true },
    chapterName: { type: String, required: true, trim: true },
    topics:      { type: [String], default: [] },
    order:       { type: Number },
  },
  { timestamps: true, versionKey: false },
);

syllabusChapterSchema.index({ schoolId: 1, class: 1, subject: 1, chapterName: 1 }, { unique: true });

export const SyllabusChapter = mongoose.model<ISyllabusChapter>('SyllabusChapter', syllabusChapterSchema);
