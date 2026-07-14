import { z } from 'zod';

export const SALARY_STATUSES = ['scheduled', 'pending', 'paid'] as const;
export const PAYMENT_MODES = ['cash', 'cheque', 'bank_transfer', 'online', 'demand_draft'] as const;

const currency = (label: string) =>
  z.number({ required_error: `${label} is required` }).positive(`${label} must be positive`)
    .multipleOf(0.01, `${label} must have at most 2 decimal places`);

// ── Create ────────────────────────────────────────────────────────────────────

export const createSalaryRecordSchema = z.object({
  employeeName: z.string({ required_error: 'employeeName is required' }).min(2).max(100).trim(),
  designation:  z.string({ required_error: 'designation is required' }).min(2).max(100).trim(),
  teacherId:    z.string().optional(),
  month:        z.string({ required_error: 'month is required' }).min(1).max(20).trim(),
  year:         z.coerce.number().int().min(2000).max(2100),
  amount:       currency('amount'),
  dueDate:      z.string({ required_error: 'dueDate is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'),
  notes:        z.string().max(1000).trim().optional(),
});

// ── Bulk Create ───────────────────────────────────────────────────────────────

export const bulkCreateSalarySchema = z.object({
  records: z.array(createSalaryRecordSchema).min(1, 'At least one record is required').max(200, 'At most 200 records per batch'),
});

// ── Update ────────────────────────────────────────────────────────────────────

export const updateSalaryRecordSchema = z.object({
  employeeName: z.string().min(2).max(100).trim().optional(),
  designation:  z.string().min(2).max(100).trim().optional(),
  month:        z.string().min(1).max(20).trim().optional(),
  year:         z.coerce.number().int().min(2000).max(2100).optional(),
  amount:       z.number().positive().multipleOf(0.01).optional(),
  dueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD').optional(),
  notes:        z.string().max(1000).trim().optional(),
});

// ── Mark Paid ─────────────────────────────────────────────────────────────────

export const markSalaryPaidSchema = z.object({
  paidDate:    z.string({ required_error: 'paidDate is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'paidDate must be YYYY-MM-DD'),
  paymentMode: z.enum(PAYMENT_MODES, { required_error: 'paymentMode is required' }),
  notes:       z.string().max(1000).trim().optional(),
});

// ── List / Query ──────────────────────────────────────────────────────────────

export const listSalarySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(SALARY_STATUSES).optional(),
  month:  z.string().optional(),
  year:   z.coerce.number().int().optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateSalaryRecordInput = z.infer<typeof createSalaryRecordSchema>;
export type BulkCreateSalaryInput   = z.infer<typeof bulkCreateSalarySchema>;
export type UpdateSalaryRecordInput = z.infer<typeof updateSalaryRecordSchema>;
export type MarkSalaryPaidInput     = z.infer<typeof markSalaryPaidSchema>;
export type ListSalaryInput         = z.infer<typeof listSalarySchema>;
