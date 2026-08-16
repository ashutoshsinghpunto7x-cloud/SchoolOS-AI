import { z } from 'zod';

export const VENDOR_CATEGORIES = ['supplies', 'services', 'maintenance', 'utilities', 'other'] as const;
export const VENDOR_STATUSES = ['active', 'inactive'] as const;
export const VENDOR_BILL_STATUSES = ['unpaid', 'partially_paid', 'paid'] as const;
export const PAYMENT_MODES = ['cash', 'cheque', 'bank_transfer', 'online', 'demand_draft'] as const;

const currency = (label: string) =>
  z.number({ required_error: `${label} is required` }).positive(`${label} must be positive`)
    .multipleOf(0.01, `${label} must have at most 2 decimal places`);

const dateStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD`);

// ── Vendor ────────────────────────────────────────────────────────────────────

export const createVendorSchema = z.object({
  name:          z.string({ required_error: 'name is required' }).min(2).max(200).trim(),
  category:      z.enum(VENDOR_CATEGORIES, { required_error: 'category is required' }),
  status:        z.enum(VENDOR_STATUSES).optional(),
  contactPerson: z.string().max(200).trim().optional(),
  phone:         z.string().max(20).trim().optional(),
  email:         z.string().email().max(200).trim().optional(),
  address:       z.string().max(500).trim().optional(),
  gstNumber:     z.string().max(30).trim().optional(),
  notes:         z.string().max(1000).trim().optional(),
});

export const updateVendorSchema = z.object({
  name:          z.string().min(2).max(200).trim().optional(),
  category:      z.enum(VENDOR_CATEGORIES).optional(),
  status:        z.enum(VENDOR_STATUSES).optional(),
  contactPerson: z.string().max(200).trim().optional(),
  phone:         z.string().max(20).trim().optional(),
  email:         z.string().email().max(200).trim().optional(),
  address:       z.string().max(500).trim().optional(),
  gstNumber:     z.string().max(30).trim().optional(),
  notes:         z.string().max(1000).trim().optional(),
});

export const listVendorsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  search:   z.string().optional(),
  category: z.enum(VENDOR_CATEGORIES).optional(),
  status:   z.enum(VENDOR_STATUSES).optional(),
});

// ── Vendor Bill ───────────────────────────────────────────────────────────────

export const createVendorBillSchema = z.object({
  billNumber:  z.string().max(100).trim().optional(),
  description: z.string({ required_error: 'description is required' }).min(2).max(500).trim(),
  category:    z.enum(VENDOR_CATEGORIES, { required_error: 'category is required' }),
  amount:      currency('amount'),
  billDate:    dateStr('billDate'),
  dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:       z.string().max(1000).trim().optional(),
});

export const listVendorBillsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(VENDOR_BILL_STATUSES).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ── Vendor Payment ────────────────────────────────────────────────────────────

export const recordVendorPaymentSchema = z.object({
  billId:          z.string().min(1).optional(),
  amount:          currency('amount'),
  paymentDate:     dateStr('paymentDate'),
  paymentMode:     z.enum(PAYMENT_MODES, { required_error: 'paymentMode is required' }),
  referenceNumber: z.string().max(100).trim().optional(),
  remarks:         z.string().max(500).trim().optional(),
  idempotencyKey:  z.string().max(100).trim().optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateVendorInput        = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput        = z.infer<typeof updateVendorSchema>;
export type ListVendorsInput         = z.infer<typeof listVendorsSchema>;
export type CreateVendorBillInput    = z.infer<typeof createVendorBillSchema>;
export type ListVendorBillsInput     = z.infer<typeof listVendorBillsSchema>;
export type RecordVendorPaymentInput = z.infer<typeof recordVendorPaymentSchema>;
