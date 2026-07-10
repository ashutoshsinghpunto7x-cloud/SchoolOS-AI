import { z } from 'zod';
import { FEE_HEADS } from './fee.validation';

export const upsertFeeStructureSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  feeHead: z.enum(FEE_HEADS, { required_error: 'feeHead is required' }),
  academicYear: z.string({ required_error: 'academicYear is required' })
    .regex(/^\d{4}-\d{2,4}$/, 'academicYear must be like 2024-25'),
  amount: z.number({ required_error: 'amount is required' }).min(0),
});

export const createDiscountRequestSchema = z.object({
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
  requestedAmount: z.number({ required_error: 'requestedAmount is required' }).positive(),
  reason: z.string({ required_error: 'reason is required' }).min(3).max(500).trim(),
});

export const reviewDiscountRequestSchema = z.object({
  reviewNote: z.string().max(500).trim().optional(),
});

export type UpsertFeeStructureInput = z.infer<typeof upsertFeeStructureSchema>;
export type CreateDiscountRequestInput = z.infer<typeof createDiscountRequestSchema>;
export type ReviewDiscountRequestInput = z.infer<typeof reviewDiscountRequestSchema>;
