import { z } from 'zod';

export const TASK_TYPES = ['explain', 'activity', 'worksheet', 'homework', 'doubt_session', 'revision', 'unit_test', 'other'] as const;

export const extractionTargetSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
});

const draftTaskSchema = z.object({
  title: z.string().min(1),
  type: z.enum(TASK_TYPES),
});

const draftWeekSchema = z.object({
  weekNumber: z.number().int().min(1),
  chapterName: z.string().min(1),
  topic: z.string().optional(),
  tasks: z.array(draftTaskSchema).default([]),
});

export const confirmPlannerSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  weeks: z.array(draftWeekSchema).min(1, 'At least one week is required'),
});

export const toggleTaskSchema = z.object({
  taskId: z.string({ required_error: 'taskId is required' }).min(1),
  status: z.enum(['pending', 'completed']),
});

export const plannerTargetSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
});

export type ExtractionTargetInput = z.infer<typeof extractionTargetSchema>;
export type ConfirmPlannerInput = z.infer<typeof confirmPlannerSchema>;
export type ToggleTaskInput = z.infer<typeof toggleTaskSchema>;
export type PlannerTargetInput = z.infer<typeof plannerTargetSchema>;
