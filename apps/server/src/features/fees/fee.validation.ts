import { z } from 'zod';

export const FEE_HEADS = [
  'tuition', 'admission', 'examination', 'transport', 'hostel', 'miscellaneous',
] as const;

export const FEE_STATUSES = [
  'pending', 'partially_paid', 'paid', 'overdue', 'waived',
] as const;

export const PAYMENT_MODES = [
  'cash', 'cheque', 'bank_transfer', 'online', 'demand_draft',
] as const;

// ── Currency helper (positive, max 2 decimal places) ─────────────────────────

const currency = (label: string) =>
  z.number({ required_error: `${label} is required` }).positive(`${label} must be positive`)
    .multipleOf(0.01, `${label} must have at most 2 decimal places`);

// ── Create Fee Record ─────────────────────────────────────────────────────────

export const createFeeRecordSchema = z.object({
  studentId:      z.string({ required_error: 'studentId is required' }).min(1),
  feeHead:        z.enum(FEE_HEADS, { required_error: 'feeHead is required' }),
  customHead:     z.string().max(100).trim().optional(),
  description:    z.string().max(500).trim().optional(),
  academicYear:   z.string({ required_error: 'academicYear is required' })
                    .regex(/^\d{4}-\d{2,4}$/, 'academicYear must be like 2024-25'),
  month:          z.string().max(20).trim().optional(),
  dueDate:        z.string({ required_error: 'dueDate is required' })
                    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'),
  totalAmount:    currency('totalAmount'),
  discountAmount: z.number().min(0).multipleOf(0.01).default(0),
  discountReason: z.string().max(200).trim().optional(),
  notes:          z.string().max(2000).trim().optional(),
});

// ── Update Fee Record ─────────────────────────────────────────────────────────

export const updateFeeRecordSchema = z.object({
  description:    z.string().max(500).trim().optional(),
  dueDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  totalAmount:    z.number().positive().multipleOf(0.01).optional(),
  discountAmount: z.number().min(0).multipleOf(0.01).optional(),
  discountReason: z.string().max(200).trim().optional(),
  status:         z.enum(FEE_STATUSES).optional(),
  waivedAmount:   z.number().min(0).multipleOf(0.01).optional(),
  waivedReason:   z.string().max(200).trim().optional(),
  notes:          z.string().max(2000).trim().optional(),
});

// ── Record Payment ────────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  feeRecordId:     z.string({ required_error: 'feeRecordId is required' }).min(1),
  amount:          currency('amount'),
  paymentDate:     z.string({ required_error: 'paymentDate is required' })
                     .regex(/^\d{4}-\d{2}-\d{2}$/, 'paymentDate must be YYYY-MM-DD'),
  paymentMode:     z.enum(PAYMENT_MODES, { required_error: 'paymentMode is required' }),
  referenceNumber: z.string().max(100).trim().optional(),
  remarks:         z.string().max(500).trim().optional(),
});

// ── List / Query ──────────────────────────────────────────────────────────────

export const listFeesSchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  search:       z.string().optional(),
  studentId:    z.string().optional(),
  class:        z.string().optional(),
  section:      z.string().optional(),
  feeHead:      z.enum(FEE_HEADS).optional(),
  status:       z.enum(FEE_STATUSES).optional(),
  academicYear: z.string().optional(),
  month:        z.string().optional(),
  dueBefore:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueAfter:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy:       z.enum(['dueDate', 'createdAt', 'totalAmount', 'balance']).default('dueDate'),
  sortOrder:    z.enum(['asc', 'desc']).default('asc'),
});

export const studentFeesSchema = z.object({
  academicYear: z.string().optional(),
  status:       z.enum(FEE_STATUSES).optional(),
});

export const outstandingSchema = z.object({
  class:    z.string().optional(),
  section:  z.string().optional(),
  feeHead:  z.enum(FEE_HEADS).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateFeeRecordInput = z.infer<typeof createFeeRecordSchema>;
export type UpdateFeeRecordInput = z.infer<typeof updateFeeRecordSchema>;
export type RecordPaymentInput   = z.infer<typeof recordPaymentSchema>;
export type ListFeesInput        = z.infer<typeof listFeesSchema>;
