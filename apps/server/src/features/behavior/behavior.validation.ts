import { z } from 'zod';

export const BEHAVIOR_CATEGORIES = ['positive', 'negative', 'neutral'] as const;

// ── ISO date helper ───────────────────────────────────────────────────────────

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

// ── Options ───────────────────────────────────────────────────────────────────

export const createBehaviorOptionSchema = z.object({
  label:    z.string({ required_error: 'label is required' }).min(1).max(80).trim(),
  category: z.enum(BEHAVIOR_CATEGORIES).default('neutral'),
});

export const updateBehaviorOptionSchema = z.object({
  label:    z.string().min(1).max(80).trim().optional(),
  category: z.enum(BEHAVIOR_CATEGORIES).optional(),
  isActive: z.boolean().optional(),
});

// ── Single record ─────────────────────────────────────────────────────────────

export const singleBehaviorRecordSchema = z.object({
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
  class:     z.string({ required_error: 'class is required' }).min(1).trim(),
  section:   z.string({ required_error: 'section is required' }).min(1).trim(),
  date:      isoDate,
  optionId:  z.string({ required_error: 'optionId is required' }).min(1),
  note:      z.string().max(300).optional(),
});

// ── Bulk submission ───────────────────────────────────────────────────────────

export const bulkBehaviorRecordSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  section: z.string({ required_error: 'section is required' }).min(1).trim(),
  date:    isoDate,
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        optionId:  z.string().min(1),
        note:      z.string().max(300).optional(),
      })
    )
    .min(1, 'At least one record required')
    .max(200, 'Max 200 records per submission'),
});

// ── Student history ───────────────────────────────────────────────────────────

export const studentBehaviorHistorySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(200).default(30),
  dateFrom: isoDate.optional(),
  dateTo:   isoDate.optional(),
});

// ── Class behaviour (load all for a class+date) ───────────────────────────────

export const classBehaviorSchema = z.object({
  date: isoDate.optional(),   // defaults to today
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateBehaviorOptionInput   = z.infer<typeof createBehaviorOptionSchema>;
export type UpdateBehaviorOptionInput   = z.infer<typeof updateBehaviorOptionSchema>;
export type SingleBehaviorRecordInput   = z.infer<typeof singleBehaviorRecordSchema>;
export type BulkBehaviorRecordInput     = z.infer<typeof bulkBehaviorRecordSchema>;
export type StudentBehaviorHistoryInput = z.infer<typeof studentBehaviorHistorySchema>;
export type ClassBehaviorInput          = z.infer<typeof classBehaviorSchema>;
