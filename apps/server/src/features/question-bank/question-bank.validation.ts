import { z } from 'zod';

export const QUESTION_TYPES = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const BLOOMS_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] as const;

// ── Extraction ─────────────────────────────────────────────────────────────────

export const extractionTargetSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
});

const extractedQuestionDraftSchema = z.object({
  questionText: z.string().min(1),
  questionType: z.enum(QUESTION_TYPES),
  options: z.array(z.string()).nullish(),
  correctAnswer: z.string().nullish(),
  difficulty: z.enum(DIFFICULTIES),
  marks: z.number().min(0),
  estimatedTimeMinutes: z.number().min(0),
  bloomsLevel: z.enum(BLOOMS_LEVELS),
  keywords: z.array(z.string()).default([]),
  chapterName: z.string().min(1),
  topic: z.string().nullish(),
  source: z.string().nullish(),
});

export const confirmExtractedQuestionsSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  questions: z.array(extractedQuestionDraftSchema).min(1, 'At least one question is required'),
});

// ── Manual CRUD ────────────────────────────────────────────────────────────────

export const createQuestionSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterName: z.string({ required_error: 'chapterName is required' }).min(1).trim(),
  topic: z.string().optional(),
  questionText: z.string({ required_error: 'questionText is required' }).min(1),
  questionType: z.enum(QUESTION_TYPES),
  options: z.array(z.string()).nullish(),
  correctAnswer: z.string().nullish(),
  difficulty: z.enum(DIFFICULTIES),
  marks: z.number().min(0),
  estimatedTimeMinutes: z.number().min(0),
  bloomsLevel: z.enum(BLOOMS_LEVELS),
  keywords: z.array(z.string()).default([]),
  source: z.string().nullish(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const listQuestionsSchema = z.object({
  class: z.string().optional(),
  subject: z.string().optional(),
  chapterId: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  questionType: z.enum(QUESTION_TYPES).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const listChaptersSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
});

// ── Paper generation ───────────────────────────────────────────────────────────

export const paperGenerationConfigSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  examType: z.string({ required_error: 'examType is required' }).min(1).trim(),
  chapterIds: z.array(z.string()).min(1, 'Select at least one chapter'),
  totalMarks: z.number().min(1),
  difficultyMix: z.object({
    easy: z.number().min(0).default(0),
    medium: z.number().min(0).default(0),
    hard: z.number().min(0).default(0),
  }),
  marksBreakdown: z.array(z.object({ marks: z.number().min(0), count: z.number().min(0) })).min(1),
  questionTypes: z.array(z.enum(QUESTION_TYPES)).default([]),
  durationMinutes: z.number().min(1).optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type ExtractionTarget = z.infer<typeof extractionTargetSchema>;
export type ExtractedQuestionDraftInput = z.infer<typeof extractedQuestionDraftSchema>;
export type ConfirmExtractedQuestionsInput = z.infer<typeof confirmExtractedQuestionsSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ListQuestionsInput = z.infer<typeof listQuestionsSchema>;
export type ListChaptersInput = z.infer<typeof listChaptersSchema>;
export type PaperGenerationConfigInput = z.infer<typeof paperGenerationConfigSchema>;
