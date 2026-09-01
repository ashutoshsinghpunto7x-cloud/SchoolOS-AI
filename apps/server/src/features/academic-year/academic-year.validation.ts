import { z } from 'zod';

const termSchema = z.object({
  termId:    z.string().min(1),
  label:     z.string().min(1).trim(),
  startDate: z.coerce.date(),
  endDate:   z.coerce.date(),
});

export const upsertAcademicYearSchema = z.object({
  label:         z.string({ required_error: 'label is required' }).min(1).trim(),
  startDate:     z.coerce.date(),
  endDate:       z.coerce.date(),
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).default([0, 6]),
  terms:         z.array(termSchema).default([]),
}).refine((d) => d.endDate > d.startDate, { message: 'endDate must be after startDate', path: ['endDate'] });

export const SPECIAL_DAY_TYPES = [
  'sports_day', 'annual_day', 'trip', 'ptm', 'activity', 'function', 'other',
] as const;

export const addSpecialDaySchema = z.object({
  date:           z.coerce.date(),
  label:          z.string({ required_error: 'label is required' }).min(1).trim(),
  type:           z.enum(SPECIAL_DAY_TYPES).default('other'),
  teachingImpact: z.enum(['full_day_off', 'half_day', 'none']).default('full_day_off'),
});

export type UpsertAcademicYearInput = z.infer<typeof upsertAcademicYearSchema>;
export type AddSpecialDayInput = z.infer<typeof addSpecialDaySchema>;
