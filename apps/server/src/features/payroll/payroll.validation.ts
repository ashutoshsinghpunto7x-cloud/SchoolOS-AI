import { z } from 'zod';

export const PAYROLL_STATUSES = ['draft', 'generated', 'paid'] as const;
export const PAYMENT_MODES = ['cash', 'cheque', 'bank_transfer', 'online', 'demand_draft'] as const;

// ── Generate ──────────────────────────────────────────────────────────────────

export const generatePayrollSchema = z.object({
  employeeObjectId: z.string({ required_error: 'employeeObjectId is required' }).min(1),
  month: z.coerce.number().int().min(1, 'month must be between 1 and 12').max(12, 'month must be between 1 and 12'),
  year:  z.coerce.number().int().min(2000).max(2100),
});

// ── Generate All ──────────────────────────────────────────────────────────────

export const generateAllPayrollSchema = z.object({
  month: z.coerce.number().int().min(1, 'month must be between 1 and 12').max(12, 'month must be between 1 and 12'),
  year:  z.coerce.number().int().min(2000).max(2100),
});

// ── Mark Paid ─────────────────────────────────────────────────────────────────

export const markPayrollPaidSchema = z.object({
  paidDate:    z.string({ required_error: 'paidDate is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'paidDate must be YYYY-MM-DD'),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  notes:       z.string().max(1000).trim().optional(),
});

// ── List / Query ──────────────────────────────────────────────────────────────

export const listPayrollSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  month:      z.coerce.number().int().min(1).max(12).optional(),
  year:       z.coerce.number().int().optional(),
  department: z.string().optional(),
  status:     z.enum(PAYROLL_STATUSES).optional(),
});

// ── Summary ───────────────────────────────────────────────────────────────────

export const payrollSummarySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year:  z.coerce.number().int().optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type GeneratePayrollInput    = z.infer<typeof generatePayrollSchema>;
export type GenerateAllPayrollInput = z.infer<typeof generateAllPayrollSchema>;
export type MarkPayrollPaidInput    = z.infer<typeof markPayrollPaidSchema>;
export type ListPayrollInput        = z.infer<typeof listPayrollSchema>;
export type PayrollSummaryInput     = z.infer<typeof payrollSummarySchema>;
