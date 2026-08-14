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

const sourceRefSchema = z.object({
  sourceId: z.string().min(1),
  pageNumber: z.number().int().min(1).optional(),
  blockIndex: z.number().int().min(0).optional(),
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
  sourceRef: sourceRefSchema.nullish(),
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

export const listQuestionGroupsSchema = z.object({
  class: z.string().optional(),
  subject: z.string().optional(),
  search: z.string().optional(),
});

export const listChaptersSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
});

// class/subject optional — omitting both lists every stored upload for the school (the "pending uploads" view).
export const listSourcesSchema = z.object({
  class: z.string().trim().optional(),
  subject: z.string().trim().optional(),
});

// ── Structured chapter capture (layout-aware OCR) ─────────────────────────────
// `.nullish()` (not just `.optional()`) throughout this section: these blocks
// round-trip through ExtractionJob's `Schema.Types.Mixed` result field between
// enqueue and save, and MongoDB's driver serializes JS `undefined` object
// properties as BSON null on write — so a field that was never set comes back
// as `null`, not simply absent, and validation has to accept both.

const listBlockItemSchema: z.ZodType<{ text: string; items?: { text: string; items?: unknown[] }[] | null }> = z.lazy(() =>
  z.object({ text: z.string().min(1), items: z.array(listBlockItemSchema).nullish() }),
);

const blockConfidenceSchema = z.enum(['high', 'review', 'low']).nullish();

const contentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), level: z.union([z.literal(1), z.literal(2), z.literal(3)]), text: z.string().min(1), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('paragraph'), text: z.string().min(1), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(listBlockItemSchema).min(1), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('table'), caption: z.string().nullish(), headers: z.array(z.string()), rows: z.array(z.array(z.string())), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('equation'), latex: z.string().min(1), displayText: z.string().nullish(), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('figure'), figureNumber: z.string().nullish(), caption: z.string().nullish(), labels: z.array(z.string()).nullish(), confidence: blockConfidenceSchema }),
  z.object({ type: z.enum(['note', 'quote']), text: z.string().min(1), confidence: blockConfidenceSchema }),
]);

const chapterPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  blocks: z.array(contentBlockSchema),
  confidence: z.enum(['high', 'review', 'low']).nullish(),
  pageError: z.string().nullish(),
});

export const updateSourceSchema = z.object({
  chapterName: z.string().min(1).trim().optional(),
  documentTitle: z.string().trim().optional(),
  pages: z.array(chapterPageSchema).optional(),
  reviewStatus: z.enum(['ready_for_review', 'saved']).optional(),
}).refine((d) => d.chapterName !== undefined || d.documentTitle !== undefined || d.pages !== undefined || d.reviewStatus !== undefined, {
  message: 'At least one field is required',
});

export const retryPageParamsSchema = z.object({
  id: z.string().min(1),
  pageNumber: z.coerce.number().int().min(1),
});

export const saveChapterSourceSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  documentTitle: z.string().trim().optional(),
  language: z.string().trim().optional(),
  chapterName: z.string().trim().optional(),
  fileName: z.string().optional(),
  pages: z.array(chapterPageSchema).min(1, 'At least one page is required'),
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
export type ListQuestionGroupsInput = z.infer<typeof listQuestionGroupsSchema>;
export type ListChaptersInput = z.infer<typeof listChaptersSchema>;
export type ListSourcesInput = z.infer<typeof listSourcesSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type PaperGenerationConfigInput = z.infer<typeof paperGenerationConfigSchema>;
export type RetryPageParamsInput = z.infer<typeof retryPageParamsSchema>;
export type SaveChapterSourceInput = z.infer<typeof saveChapterSourceSchema>;
