import { z } from 'zod';

export const planTargetSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1),
  section: z.string().optional(),
  subject: z.string({ required_error: 'subject is required' }).min(1),
});

export const generatePlanSchema = planTargetSchema.extend({
  chapterIds: z.array(z.string()).optional(),
});

export const DAY_STATUSES = ['pending', 'completed', 'partial', 'carried_forward', 'needs_extra_class'] as const;

export const setDayStatusSchema = z.object({
  date:   z.coerce.date(),
  status: z.enum(DAY_STATUSES),
  note:   z.string().trim().max(500).optional(),
});

export type PlanTargetInput = z.infer<typeof planTargetSchema>;
export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;
export type SetDayStatusInput = z.infer<typeof setDayStatusSchema>;
