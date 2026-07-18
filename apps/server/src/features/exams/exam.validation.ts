import { z } from 'zod';

export const EXAM_TYPES = [
  'unit_test', 'monthly_test', 'half_yearly', 'annual', 'practical', 'internal_assessment', 'other',
] as const;

export const EXAM_STATUSES = ['draft', 'configured', 'locked'] as const;

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const examComponentSchema = z.object({
  name:      z.string({ required_error: 'component name is required' }).min(1).trim(),
  maxMarks:  z.number({ required_error: 'maxMarks is required' }).min(0),
  passMarks: z.number().min(0).optional(),
  weight:    z.number().min(0).optional(),
});

const gradeBandSchema = z.object({
  label:      z.string({ required_error: 'grade label is required' }).min(1).trim(),
  minPercent: z.number().min(0).max(100),
  maxPercent: z.number().min(0).max(100),
});

// ── Create / Update ───────────────────────────────────────────────────────────

export const createExamSchema = z.object({
  name:                  z.string({ required_error: 'name is required' }).min(1).trim(),
  examType:              z.enum(EXAM_TYPES, { required_error: 'examType is required' }),
  termLabel:             z.string().trim().optional(),
  classesApplicable:     z.array(z.string().trim().min(1)).min(1, 'At least one class is required'),
  subjects:              z.array(z.string().trim().min(1)).min(1, 'At least one subject is required'),
  components:            z.array(examComponentSchema).min(1, 'At least one assessment component is required'),
  gradingBands:          z.array(gradeBandSchema).default([]),
  passPercent:           z.number().min(0).max(100).default(33),
  subjectWiseMinPercent: z.number().min(0).max(100).optional(),
});

export const updateExamSchema = createExamSchema.partial();

export const updateExamStatusSchema = z.object({
  status: z.enum(EXAM_STATUSES, { required_error: 'status is required' }),
});

// ── List / filter query ───────────────────────────────────────────────────────

export const listExamSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(200).default(50),
  class:    z.string().optional(),
  examType: z.enum(EXAM_TYPES).optional(),
  status:   z.enum(EXAM_STATUSES).optional(),
  search:   z.string().optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateExamInput       = z.infer<typeof createExamSchema>;
export type UpdateExamInput       = z.infer<typeof updateExamSchema>;
export type UpdateExamStatusInput = z.infer<typeof updateExamStatusSchema>;
export type ListExamInput         = z.infer<typeof listExamSchema>;
