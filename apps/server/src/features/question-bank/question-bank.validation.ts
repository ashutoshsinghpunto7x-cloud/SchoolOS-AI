import { z } from 'zod';
import type { ListBlockItem } from '@schoolos/types';

export const QUESTION_TYPES = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const BLOOMS_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] as const;

// ── Extraction ─────────────────────────────────────────────────────────────────

export const extractionTargetSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  // Query-string boolean — arrives as the literal string "true"/"false" (or is absent), never a
  // real boolean, since this is parsed from req.query.
  detectImages: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});

const sourceRefSchema = z.object({
  sourceId: z.string().min(1),
  pageNumber: z.number().int().min(1).optional(),
  blockIndex: z.number().int().min(0).optional(),
});

const imageRefSchema = z.object({ sourceId: z.string().min(1), figureId: z.string().min(1) });
const imageRequirementSchema = z.object({
  imageRequired: z.literal(true),
  imageSource: z.enum(['generated', 'teacher_upload']),
  imagePrompt: z.string().optional(),
});

// A saved "mcq" question with fewer than 2 options prints on the exam paper with no answer
// choices at all — nothing else catches this (PaperDocument only renders the options block when
// `options` is truthy, and paper-validation.service only warns about coverage/marks/difficulty,
// not per-question shape) — so it's enforced right here, at the point every question type first
// gets accepted from a teacher.
function requireMcqOptions<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((val, ctx) => {
    const v = val as { questionType?: string; options?: string[] | null };
    if (v.questionType === 'mcq' && (!v.options || v.options.filter((o) => o.trim()).length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'An MCQ question needs at least 2 answer options' });
    }
  });
}

const extractedQuestionDraftSchema = requireMcqOptions(z.object({
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
  imageRef: imageRefSchema.nullish(),
  imageRequirement: imageRequirementSchema.nullish(),
}));

export const confirmExtractedQuestionsSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  questions: z.array(extractedQuestionDraftSchema).min(1, 'At least one question is required'),
});

// ── Manual CRUD ────────────────────────────────────────────────────────────────

const baseQuestionSchema = z.object({
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

export const createQuestionSchema = requireMcqOptions(baseQuestionSchema);
// Not run through requireMcqOptions: a partial update omitting `options` (e.g. changing only the
// marks value) shouldn't be rejected just because the existing, already-valid question happens to
// be an mcq — this schema has no view of the question's current saved options to check against.
export const updateQuestionSchema = baseQuestionSchema.partial();

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

// Bulk/"collective" delete from the chapter-grouped landing view — one or more whole chapters at once.
export const deleteQuestionGroupsSchema = z.object({
  groups: z.array(z.object({
    class: z.string({ required_error: 'class is required' }).min(1).trim(),
    subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
    chapterId: z.string({ required_error: 'chapterId is required' }).min(1).trim(),
  })).min(1, 'Select at least one chapter'),
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
// as `null`, not simply absent, and validation has to accept both. Each of
// these is chained with `.transform(v => v ?? undefined)` so the *parsed*
// output — what the rest of the app actually works with — collapses back to
// plain `| undefined`, matching the shared ContentBlock/ChapterPage types in
// @schoolos/types (which don't allow null). Without the transform, z.infer
// leaks `| null` into those types and apps/server fails to build (`tsc`),
// even though `tsx`'s transpile-only dev server never catches it.
const nullishString = () => z.string().nullish().transform((v) => v ?? undefined);

// Raw wire shape (pre-transform) is recursively nullable, same rationale as the module comment above;
// the schema's *output* — the second/third type params below — collapses to the plain, non-null
// ListBlockItem shared with the rest of the app.
type ListBlockItemInput = { text: string; items?: ListBlockItemInput[] | null };

const listBlockItemSchema: z.ZodType<ListBlockItem, z.ZodTypeDef, ListBlockItemInput> = z.lazy(() =>
  z.object({ text: z.string().min(1), items: z.array(listBlockItemSchema).nullish().transform((v) => v ?? undefined) }),
);

const blockConfidenceSchema = z.enum(['high', 'review', 'low']).nullish().transform((v) => v ?? undefined);

const contentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), level: z.union([z.literal(1), z.literal(2), z.literal(3)]), text: z.string().min(1), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('paragraph'), text: z.string().min(1), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(listBlockItemSchema).min(1), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('table'), caption: nullishString(), headers: z.array(z.string()), rows: z.array(z.array(z.string())), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('equation'), latex: z.string().min(1), displayText: nullishString(), confidence: blockConfidenceSchema }),
  z.object({ type: z.literal('figure'), figureNumber: nullishString(), caption: nullishString(), labels: z.array(z.string()).nullish().transform((v) => v ?? undefined), confidence: blockConfidenceSchema }),
  z.object({ type: z.enum(['note', 'quote']), text: z.string().min(1), confidence: blockConfidenceSchema }),
]);

const chapterPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  blocks: z.array(contentBlockSchema),
  confidence: z.enum(['high', 'review', 'low']).nullish().transform((v) => v ?? undefined),
  pageError: nullishString(),
});

export const updateSourceSchema = z.object({
  chapterName: z.string().min(1).trim().optional(),
  documentTitle: z.string().trim().optional(),
  pages: z.array(chapterPageSchema).optional(),
  reviewStatus: z.enum(['ready_for_review', 'saved']).optional(),
}).refine((d) => d.chapterName !== undefined || d.documentTitle !== undefined || d.pages !== undefined || d.reviewStatus !== undefined, {
  message: 'At least one field is required',
});

// Teacher picks these up front (count + difficulty) instead of the AI silently pulling every
// question it can find at max verbosity — keeps generation fast for a short/simple page and
// gives the teacher control over what comes back. Raised from 20 to 100 now that generation
// batches internally (see structureFromText in question-extraction.service.ts) — a teacher
// generating a full half-yearly/yearly paper's worth of questions off one upload no longer
// needs to re-run this multiple times; 100 stays a sane outer ceiling on cost/latency per call.
export const reExtractSourceSchema = z.object({
  count: z.number().int().min(1).max(100).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  languageComplexity: z.enum(['auto', 'simple', 'standard', 'advanced']).default('auto'),
  includeImages: z.boolean().default(false),
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
  languageComplexity: z.enum(['auto', 'simple', 'standard', 'advanced']).default('auto'),
  includeAnswerKey: z.boolean().default(false),
  includeImages: z.boolean().default(false),
  blackAndWhite: z.boolean().default(false),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type ExtractionTarget = z.infer<typeof extractionTargetSchema>;
export type ExtractedQuestionDraftInput = z.infer<typeof extractedQuestionDraftSchema>;
export type ConfirmExtractedQuestionsInput = z.infer<typeof confirmExtractedQuestionsSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ListQuestionsInput = z.infer<typeof listQuestionsSchema>;
export type ListQuestionGroupsInput = z.infer<typeof listQuestionGroupsSchema>;
export type DeleteQuestionGroupsInput = z.infer<typeof deleteQuestionGroupsSchema>;
export type ListChaptersInput = z.infer<typeof listChaptersSchema>;
export type ListSourcesInput = z.infer<typeof listSourcesSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type PaperGenerationConfigInput = z.infer<typeof paperGenerationConfigSchema>;
export type RetryPageParamsInput = z.infer<typeof retryPageParamsSchema>;
export type ReExtractSourceInput = z.infer<typeof reExtractSourceSchema>;
export type SaveChapterSourceInput = z.infer<typeof saveChapterSourceSchema>;
