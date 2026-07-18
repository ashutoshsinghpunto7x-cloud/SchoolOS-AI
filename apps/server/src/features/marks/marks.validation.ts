import { z } from 'zod';

export const COMPONENT_STATUSES = ['present', 'absent', 'exempt', 'medical', 'not_assessed'] as const;
export const WORKFLOW_STATUSES = [
  'draft', 'submitted', 'needs_correction', 'approved', 'published', 'locked', 'reopened',
] as const;

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const componentScoreSchema = z.object({
  componentName: z.string({ required_error: 'componentName is required' }).min(1).trim(),
  score:         z.number().min(0).optional(),
  status:        z.enum(COMPONENT_STATUSES).default('present'),
});

// ── Single student upsert (draft save / inline edit) ──────────────────────────

export const upsertMarksSchema = z.object({
  examId:      z.string({ required_error: 'examId is required' }).min(1),
  studentId:   z.string({ required_error: 'studentId is required' }).min(1),
  class:       z.string({ required_error: 'class is required' }).min(1).trim(),
  section:     z.string({ required_error: 'section is required' }).min(1).trim(),
  subjectName: z.string({ required_error: 'subjectName is required' }).min(1).trim(),
  componentScores: z.array(componentScoreSchema).min(1, 'At least one component score is required'),
  remark: z.string().max(500).optional(),
});

// ── Bulk upsert (class-wide draft save / paste-from-spreadsheet) ──────────────

export const bulkUpsertMarksSchema = z.object({
  examId:      z.string({ required_error: 'examId is required' }).min(1),
  class:       z.string({ required_error: 'class is required' }).min(1).trim(),
  section:     z.string({ required_error: 'section is required' }).min(1).trim(),
  subjectName: z.string({ required_error: 'subjectName is required' }).min(1).trim(),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        componentScores: z.array(componentScoreSchema).min(1),
        remark: z.string().max(500).optional(),
      })
    )
    .min(1, 'At least one record required')
    .max(300, 'Max 300 records per submission'),
});

// ── Batch action targeting (submit / review / publish / lock) ────────────────

export const marksBatchTargetSchema = z.object({
  examId:      z.string({ required_error: 'examId is required' }).min(1),
  class:       z.string({ required_error: 'class is required' }).min(1).trim(),
  section:     z.string({ required_error: 'section is required' }).min(1).trim(),
  subjectName: z.string({ required_error: 'subjectName is required' }).min(1).trim(),
});

export const reviewActionSchema = marksBatchTargetSchema.extend({
  studentIds: z.array(z.string().min(1)).optional(), // omit = apply to all submitted records
  reason: z.string().max(500).optional(),
});

export const reopenActionSchema = marksBatchTargetSchema.extend({
  reason: z.string({ required_error: 'A reason is required to reopen published marks' }).min(3).max(500),
});

// ── List / filter query ───────────────────────────────────────────────────────

export const listMarksSchema = z.object({
  examId:         z.string().optional(),
  class:          z.string().optional(),
  section:        z.string().optional(),
  subjectName:    z.string().optional(),
  studentId:      z.string().optional(),
  workflowStatus: z.enum(WORKFLOW_STATUSES).optional(),
  search:         z.string().optional(),
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(500).default(300),
});

export const entryTableQuerySchema = z.object({
  examId:      z.string({ required_error: 'examId is required' }).min(1),
  class:       z.string({ required_error: 'class is required' }).min(1).trim(),
  section:     z.string({ required_error: 'section is required' }).min(1).trim(),
  subjectName: z.string({ required_error: 'subjectName is required' }).min(1).trim(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type UpsertMarksInput     = z.infer<typeof upsertMarksSchema>;
export type BulkUpsertMarksInput = z.infer<typeof bulkUpsertMarksSchema>;
export type MarksBatchTarget     = z.infer<typeof marksBatchTargetSchema>;
export type ReviewActionInput    = z.infer<typeof reviewActionSchema>;
export type ReopenActionInput    = z.infer<typeof reopenActionSchema>;
export type ListMarksInput       = z.infer<typeof listMarksSchema>;
export type EntryTableQuery      = z.infer<typeof entryTableQuerySchema>;
