import { z } from 'zod';

export const WORKSHEET_TYPES = ['practice', 'homework', 'revision', 'hots', 'olympiad', 'remedial'] as const;
export const QUESTION_TYPES = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export const generateWorksheetSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterIds: z.array(z.string()).min(1, 'Select at least one chapter'),
  worksheetType: z.enum(WORKSHEET_TYPES),
  questionCount: z.number().int().min(1).max(50),
  languageComplexity: z.enum(['auto', 'simple', 'standard', 'advanced']).default('auto'),
  includeImages: z.boolean().default(false),
});

const imageRefSchema = z.object({ sourceId: z.string(), figureId: z.string() });
const imageRequirementSchema = z.object({
  imageRequired: z.literal(true),
  imageSource: z.enum(['generated', 'teacher_upload']),
  imagePrompt: z.string().optional(),
});

const worksheetQuestionSchema = z.object({
  questionId: z.string().optional(),
  questionText: z.string().min(1),
  questionType: z.enum(QUESTION_TYPES),
  options: z.array(z.string()).nullable().optional(),
  difficulty: z.enum(DIFFICULTIES),
  estimatedTimeMinutes: z.number().min(0),
  keywords: z.array(z.string()).default([]),
  isNew: z.boolean().optional(),
  imageRef: imageRefSchema.optional(),
  imageRequirement: imageRequirementSchema.optional(),
});

export const saveWorksheetSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterIds: z.array(z.string()).min(1, 'Select at least one chapter'),
  worksheetType: z.enum(WORKSHEET_TYPES),
  title: z.string({ required_error: 'title is required' }).min(1).trim(),
  questions: z.array(worksheetQuestionSchema).min(1, 'At least one question is required'),
  addNewToBank: z.boolean().default(true),
});

/** PATCH /worksheet-generator/:id — post-save editing (title + per-question text/difficulty/time). Doesn't touch chapterIds/worksheetType/questions[].options — reuse Regenerate for a structural change. */
export const updateWorksheetSchema = z.object({
  title: z.string().min(1).trim().optional(),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    difficulty: z.enum(DIFFICULTIES),
    estimatedTimeMinutes: z.number().min(0),
  })).optional(),
});

export const listWorksheetsSchema = z.object({
  class: z.string().optional(),
  subject: z.string().optional(),
  chapterId: z.string().optional(),
  worksheetType: z.enum(WORKSHEET_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GenerateWorksheetInput = z.infer<typeof generateWorksheetSchema>;
export type SaveWorksheetInput = z.infer<typeof saveWorksheetSchema>;
export type ListWorksheetsInput = z.infer<typeof listWorksheetsSchema>;
export type UpdateWorksheetInput = z.infer<typeof updateWorksheetSchema>;
