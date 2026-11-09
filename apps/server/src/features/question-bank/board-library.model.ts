import mongoose, { Document, Schema } from 'mongoose';
import type { QuestionType, QuestionDifficulty } from './question.model';

/**
 * Platform-wide library of previous-year board papers (e.g. UP Board Class 12, 2023–2026).
 * Deliberately has NO schoolId — one transcription serves every school. A school opts in
 * per subject via boardLibraryService.syncToSchool, which copies the questions into that
 * school's own Question/SyllabusChapter collections so Paper Generator and Worksheet
 * Generator work on them with zero changes.
 *
 * Content is transcribed by hand from scanned PDFs (no AI extraction) and loaded from
 * apps/server/data/board-papers/*.json by scripts/import-board-papers.ts.
 */
export interface IBoardPaperQuestion {
  /** Section label from the paper, e.g. "A", "B", "C". */
  section: string;
  /** Question number as printed, e.g. "1(क)", "7", "21". */
  number: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  marks: number;
  difficulty?: QuestionDifficulty;
  correctAnswer?: string;
  /** Syllabus unit/chapter if known — otherwise questions sync under the paper's own chapter. */
  chapterName?: string;
  /** True when the printed question depends on a diagram/figure that was not transcribed. */
  hasFigure?: boolean;
}

export interface IBoardPaper extends Document {
  board: string;
  class: string;
  subject: string;
  year: number;
  paperCode?: string;
  language: 'en' | 'hi' | 'bilingual';
  questions: IBoardPaperQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const boardPaperQuestionSchema = new Schema<IBoardPaperQuestion>(
  {
    section:      { type: String, required: true, trim: true },
    number:       { type: String, required: true, trim: true },
    questionText: { type: String, required: true, trim: true },
    questionType: { type: String, required: true },
    options:      { type: [String], default: undefined },
    marks:        { type: Number, required: true, min: 0 },
    difficulty:   { type: String, enum: ['easy', 'medium', 'hard'] },
    correctAnswer: { type: String, trim: true },
    chapterName:  { type: String, trim: true },
    hasFigure:    { type: Boolean },
  },
  { _id: false },
);

const boardPaperSchema = new Schema<IBoardPaper>(
  {
    board:     { type: String, required: true, trim: true },
    class:     { type: String, required: true, trim: true },
    subject:   { type: String, required: true, trim: true },
    year:      { type: Number, required: true },
    paperCode: { type: String, trim: true },
    language:  { type: String, enum: ['en', 'hi', 'bilingual'], default: 'bilingual' },
    questions: { type: [boardPaperQuestionSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

boardPaperSchema.index({ board: 1, class: 1, subject: 1, year: 1 }, { unique: true });

export const BoardPaper = mongoose.model<IBoardPaper>('BoardPaper', boardPaperSchema);
