import { z } from 'zod';

export const TASK_TYPES = ['explain', 'activity', 'worksheet', 'homework', 'doubt_session', 'revision', 'unit_test', 'other'] as const;

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

export const updateTaskSchema = z.object({
  taskId: z.string({ required_error: 'taskId is required' }).min(1),
  status: z.enum(['pending', 'completed']).optional(),
  title: z.string().min(1).trim().optional(),
  dueDate: z.coerce.date().optional(),
}).refine(
  (d) => d.status !== undefined || d.title !== undefined || d.dueDate !== undefined,
  { message: 'Provide at least one of status, title, or dueDate to update' },
);

export const plannerTargetSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
});

const chapterPlanSchema = z.object({
  chapterId: z.string().min(1),
  weeks: z.number().int().min(1).max(52),
  // How many lecture periods a week for this chapter — caps the number of
  // tasks generated per week. Omit to fall back to one task per teaching day.
  lecturesPerWeek: z.number().int().min(1).max(10).optional(),
});

export const generatePlannerSchema = z.object({
  class:        z.string({ required_error: 'class is required' }).min(1).trim(),
  subject:      z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterPlans: z.array(chapterPlanSchema).min(1, 'Select at least one chapter'),
  // How many teaching weeks are already spoken for by weeks staged in the
  // review screen (e.g. adding more chapters to an existing/edited plan) —
  // generation resumes after that point instead of restarting from week 1.
  startFromWeek: z.number().int().min(0).optional(),
});

export type ConfirmPlannerInput = z.infer<typeof confirmPlannerSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type PlannerTargetInput = z.infer<typeof plannerTargetSchema>;
export type GeneratePlannerInput = z.infer<typeof generatePlannerSchema>;
