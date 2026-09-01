import { z } from 'zod';

const PAYMENT_STATUSES = ['pending', 'paid', 'waived'] as const;

export const issueAdmissionFormSchema = z.object({
  enquiryId: z.string().trim().min(1, 'Admission form must be linked to an enquiry'),
  formFee:   z.coerce.number().min(0, 'Form fee cannot be negative'),
});

export const updatePaymentSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paymentTxnId:  z.string().trim().max(200).optional(),
});

export const verifyFormSchema = z.object({
  approve:         z.boolean(),
  rejectionReason: z.string().trim().max(1000).optional(),
}).refine((data) => data.approve || !!data.rejectionReason?.trim(), {
  message: 'A rejection reason is required when rejecting a form',
  path: ['rejectionReason'],
});

export const addChecklistItemSchema = z.object({
  documentType: z.string().trim().min(1, 'Document name is required').max(200),
});

export const updateChecklistItemSchema = z.object({
  received: z.boolean().optional(),
});

export const listAdmissionFormsSchema = z.object({
  page:               z.coerce.number().int().min(1).default(1),
  limit:              z.coerce.number().int().min(1).max(200).default(50),
  search:             z.string().trim().optional(),
  paymentStatus:      z.enum(PAYMENT_STATUSES).optional(),
  verificationStatus: z.enum(['not_submitted', 'pending_verification', 'verified', 'rejected']).optional(),
});
