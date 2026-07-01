import { z } from 'zod';

export const EXPENSE_CATEGORIES = ['electricity', 'maintenance', 'fuel', 'supplies', 'other'] as const;
export const EXPENSE_STATUSES = ['pending', 'approved'] as const;

const currency = (label: string) =>
  z.number({ required_error: `${label} is required` }).positive(`${label} must be positive`)
    .multipleOf(0.01, `${label} must have at most 2 decimal places`);

// ── Create ────────────────────────────────────────────────────────────────────

export const createExpenseRecordSchema = z.object({
  title:    z.string({ required_error: 'title is required' }).min(2).max(200).trim(),
  category: z.enum(EXPENSE_CATEGORIES, { required_error: 'category is required' }),
  amount:   currency('amount'),
  date:     z.string({ required_error: 'date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  notes:    z.string().max(1000).trim().optional(),
});

// ── Update ────────────────────────────────────────────────────────────────────

export const updateExpenseRecordSchema = z.object({
  title:    z.string().min(2).max(200).trim().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  amount:   z.number().positive().multipleOf(0.01).optional(),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:   z.enum(EXPENSE_STATUSES).optional(),
  notes:    z.string().max(1000).trim().optional(),
});

// ── List / Query ──────────────────────────────────────────────────────────────

export const listExpensesSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  search:   z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  status:   z.enum(EXPENSE_STATUSES).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateExpenseRecordInput = z.infer<typeof createExpenseRecordSchema>;
export type UpdateExpenseRecordInput = z.infer<typeof updateExpenseRecordSchema>;
export type ListExpensesInput        = z.infer<typeof listExpensesSchema>;
