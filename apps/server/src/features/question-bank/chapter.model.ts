import mongoose, { Document, Schema } from 'mongoose';

// Auto-derived from AI extraction (no manual pre-setup required) — a teacher
// uploading a textbook page/PDF gets its chapter matched against existing
// rows for that class+subject (fuzzy name match, see question-extraction.service.ts),
// or a new one created on the fly. Teachers can rename/merge afterward.

export type ChapterDifficulty = 'easy' | 'moderate' | 'hard';
export type ChapterPriority = 'core' | 'important' | 'supplementary';
export type ChapterExtractionStatus = 'unprocessed' | 'processing' | 'processed';

export interface ISubtopicNode {
  subtopicId: string;
  name: string;
  order: number;
}

export interface ITopicNode {
  topicId: string;
  name: string;
  order: number;
  subtopics: ISubtopicNode[];
}

export interface ISyllabusChapter extends Document {
  schoolId: string;
  class: string;
  subject: string;
  chapterName: string;
  topics: string[];
  // Structured topic/subtopic hierarchy derived from AI chapter-capture (see
  // question-extraction.service.ts's structureFromText topic pass). Optional —
  // only chapters captured after this was added carry one; legacy chapters keep
  // relying on the flat `topics` list above.
  topicTree?: ITopicNode[];
  order?: number;
  // ── Sizing for the Academic Planning Engine ──────────────────────────────
  // All optional — a chapter tagged before these existed (or never sized by
  // a coordinator) just falls back to an even split of the term, same as
  // Teacher Planner v2's manual "N weeks" input did.
  estimatedPeriods?: number;
  difficulty?: ChapterDifficulty;
  priority?: ChapterPriority;
  revisionWeight?: number; // 1 (light) – 5 (heavy)
  // ── Process-once guard for chapter-capture re-extraction ─────────────────
  // See question-extraction.service.ts: a chapter_capture job hashes its
  // normalized source text and skips re-running the AI entirely when the
  // hash matches what's already been processed.
  extractionStatus: ChapterExtractionStatus;
  sourceContentHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CHAPTER_DIFFICULTIES: ChapterDifficulty[] = ['easy', 'moderate', 'hard'];
const CHAPTER_PRIORITIES: ChapterPriority[] = ['core', 'important', 'supplementary'];
const CHAPTER_EXTRACTION_STATUSES: ChapterExtractionStatus[] = ['unprocessed', 'processing', 'processed'];

const subtopicNodeSchema = new Schema<ISubtopicNode>(
  {
    subtopicId: { type: String, required: true },
    name:       { type: String, required: true, trim: true },
    order:      { type: Number, required: true },
  },
  { _id: false },
);

const topicNodeSchema = new Schema<ITopicNode>(
  {
    topicId:   { type: String, required: true },
    name:      { type: String, required: true, trim: true },
    order:     { type: Number, required: true },
    subtopics: { type: [subtopicNodeSchema], default: [] },
  },
  { _id: false },
);

const syllabusChapterSchema = new Schema<ISyllabusChapter>(
  {
    schoolId:    { type: String, required: true, default: 'DEMO_SCHOOL' },
    class:       { type: String, required: true, trim: true },
    subject:     { type: String, required: true, trim: true },
    chapterName: { type: String, required: true, trim: true },
    topics:      { type: [String], default: [] },
    topicTree:   { type: [topicNodeSchema], default: undefined },
    order:       { type: Number },
    estimatedPeriods: { type: Number, min: 1 },
    difficulty:       { type: String, enum: CHAPTER_DIFFICULTIES },
    priority:         { type: String, enum: CHAPTER_PRIORITIES },
    revisionWeight:   { type: Number, min: 1, max: 5 },
    extractionStatus: { type: String, enum: CHAPTER_EXTRACTION_STATUSES, default: 'unprocessed' },
    sourceContentHash: { type: String },
  },
  { timestamps: true, versionKey: false },
);

syllabusChapterSchema.index({ schoolId: 1, class: 1, subject: 1, chapterName: 1 }, { unique: true });

export const SyllabusChapter = mongoose.model<ISyllabusChapter>('SyllabusChapter', syllabusChapterSchema);
