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

export const BLOCK_TYPES = ['teach', 'revision', 'assessment', 'buffer'] as const;

export const editDaySchema = z.object({
  date:        z.coerce.date(),
  blockType:   z.enum(BLOCK_TYPES).optional(),
  chapterId:   z.string().optional(),
  chapterName: z.string().trim().max(200).optional(),
  topicTitle:  z.string().trim().max(300).optional(),
}).refine(
  (d) => d.blockType !== undefined || d.chapterId !== undefined || d.chapterName !== undefined || d.topicTitle !== undefined,
  { message: 'Provide at least one field to change besides date' },
);

export const moveDaySchema = z.object({
  fromDate: z.coerce.date(),
  toDate:   z.coerce.date(),
});

export type PlanTargetInput = z.infer<typeof planTargetSchema>;
export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;
export type SetDayStatusInput = z.infer<typeof setDayStatusSchema>;
export type EditDayInput = z.infer<typeof editDaySchema>;
export type MoveDayInput = z.infer<typeof moveDaySchema>;
