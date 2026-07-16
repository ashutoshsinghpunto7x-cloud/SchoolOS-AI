import { z } from 'zod';
import { FEE_HEADS } from './fee.validation';

const scheduleItemSchema = z.object({
  academicMonth: z.string({ required_error: 'academicMonth is required' }).min(1).trim(),
  feeHead:       z.enum(FEE_HEADS, { required_error: 'feeHead is required' }),
});

export const upsertCollectionScheduleSchema = z.object({
  academicYear: z.string({ required_error: 'academicYear is required' })
    .regex(/^\d{4}-\d{2,4}$/, 'academicYear must be like 2024-25'),
  depositMonth: z.string({ required_error: 'depositMonth is required' }).min(1).trim(),
  items:        z.array(scheduleItemSchema).default([]),
});

export const useDefaultScheduleSchema = z.object({
  academicYear: z.string({ required_error: 'academicYear is required' })
    .regex(/^\d{4}-\d{2,4}$/, 'academicYear must be like 2024-25'),
});

export type UpsertCollectionScheduleInput = z.infer<typeof upsertCollectionScheduleSchema>;
export type UseDefaultScheduleInput = z.infer<typeof useDefaultScheduleSchema>;
