import mongoose, { Document, Schema } from 'mongoose';

// Auto-derived from AI extraction (no manual pre-setup required) — a teacher
// uploading a textbook page/PDF gets its chapter matched against existing
// rows for that class+subject (fuzzy name match, see question-extraction.service.ts),
// or a new one created on the fly. Teachers can rename/merge afterward.

export type ChapterDifficulty = 'easy' | 'moderate' | 'hard';
export type ChapterPriority = 'core' | 'important' | 'supplementary';

export interface ISyllabusChapter extends Document {
  schoolId: string;
  class: string;
  subject: string;
  chapterName: string;
  topics: string[];
  order?: number;
  // ── Sizing for the Academic Planning Engine ──────────────────────────────
  // All optional — a chapter tagged before these existed (or never sized by
  // a coordinator) just falls back to an even split of the term, same as
  // Teacher Planner v2's manual "N weeks" input did.
  estimatedPeriods?: number;
  difficulty?: ChapterDifficulty;
  priority?: ChapterPriority;
  revisionWeight?: number; // 1 (light) – 5 (heavy)
  createdAt: Date;
  updatedAt: Date;
}

const CHAPTER_DIFFICULTIES: ChapterDifficulty[] = ['easy', 'moderate', 'hard'];
const CHAPTER_PRIORITIES: ChapterPriority[] = ['core', 'important', 'supplementary'];

const syllabusChapterSchema = new Schema<ISyllabusChapter>(
  {
    schoolId:    { type: String, required: true, default: 'DEMO_SCHOOL' },
    class:       { type: String, required: true, trim: true },
    subject:     { type: String, required: true, trim: true },
    chapterName: { type: String, required: true, trim: true },
    topics:      { type: [String], default: [] },
    order:       { type: Number },
    estimatedPeriods: { type: Number, min: 1 },
    difficulty:       { type: String, enum: CHAPTER_DIFFICULTIES },
    priority:         { type: String, enum: CHAPTER_PRIORITIES },
    revisionWeight:   { type: Number, min: 1, max: 5 },
  },
  { timestamps: true, versionKey: false },
);

syllabusChapterSchema.index({ schoolId: 1, class: 1, subject: 1, chapterName: 1 }, { unique: true });

export const SyllabusChapter = mongoose.model<ISyllabusChapter>('SyllabusChapter', syllabusChapterSchema);
