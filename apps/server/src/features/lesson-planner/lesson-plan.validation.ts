import { z } from 'zod';

export const generateLessonPlanSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterName: z.string({ required_error: 'chapterName is required' }).min(1).trim(),
  topic: z.string().optional(),
  durationMinutes: z.number().min(1).max(300),
});

export const saveLessonPlanSchema = z.object({
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterName: z.string({ required_error: 'chapterName is required' }).min(1).trim(),
  topic: z.string().optional(),
  durationMinutes: z.number().min(1).max(300),
  objective: z.string().min(1),
  introduction: z.string().min(1),
  explanation: z.string().min(1),
  activities: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  homework: z.string().min(1),
  assessment: z.string().min(1),
});

export const updateLessonPlanSchema = z.object({
  durationMinutes: z.number().min(1).max(300).optional(),
  objective: z.string().min(1).optional(),
  introduction: z.string().min(1).optional(),
  explanation: z.string().min(1).optional(),
  activities: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  homework: z.string().min(1).optional(),
  assessment: z.string().min(1).optional(),
});

export const listLessonPlansSchema = z.object({
  class: z.string().optional(),
  subject: z.string().optional(),
  chapterId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GenerateLessonPlanInput = z.infer<typeof generateLessonPlanSchema>;
export type SaveLessonPlanInput = z.infer<typeof saveLessonPlanSchema>;
export type UpdateLessonPlanInput = z.infer<typeof updateLessonPlanSchema>;
export type ListLessonPlansInput = z.infer<typeof listLessonPlansSchema>;
