import { z } from 'zod';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const;
const MODES = ['anonymous', 'ranked'] as const;
const STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'live', 'closed'] as const;

export const generateMockTestSchema = z.object({
  // Ops Center is cross-tenant — internal staff accounts have no real schoolId of their own,
  // so the target school is picked explicitly rather than inferred from the caller's own account.
  schoolId: z.string({ required_error: 'schoolId is required' }).min(1),
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterIds: z.array(z.string()).min(1, 'Select at least one chapter'),
  questionCount: z.number().int().min(1).max(30).default(10),
  difficulty: z.enum(DIFFICULTIES).default('mixed'),
});

const questionInputSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctOptionIndex: z.number().int().min(0),
  marks: z.number().min(0).default(1),
}).refine((q) => q.correctOptionIndex < q.options.length, { message: 'correctOptionIndex out of range' });

export const createMockTestSchema = z.object({
  schoolId: z.string({ required_error: 'schoolId is required' }).min(1),
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  chapterIds: z.array(z.string()).min(1),
  chapterNames: z.array(z.string()).min(1),
  title: z.string({ required_error: 'title is required' }).min(1).trim(),
  questions: z.array(questionInputSchema).min(1, 'At least one question is required'),
  durationMinutes: z.number().int().min(1).max(240).default(30),
  scheduledStart: z.string({ required_error: 'scheduledStart is required' }).datetime().or(z.string().min(1)),
  scheduledEnd: z.string({ required_error: 'scheduledEnd is required' }).datetime().or(z.string().min(1)),
  mode: z.enum(MODES).default('anonymous'),
}).refine((d) => new Date(d.scheduledEnd).getTime() > new Date(d.scheduledStart).getTime(), {
  message: 'scheduledEnd must be after scheduledStart',
  path: ['scheduledEnd'],
});

export const updateMockTestSchema = z.object({
  title: z.string().min(1).trim().optional(),
  questions: z.array(questionInputSchema).min(1).optional(),
  durationMinutes: z.number().int().min(1).max(240).optional(),
  scheduledStart: z.string().min(1).optional(),
  scheduledEnd: z.string().min(1).optional(),
  mode: z.enum(MODES).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const listMockTestsSchema = z.object({
  schoolId: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  class: z.string().optional(),
  subject: z.string().optional(),
});

export const opsIdQuerySchema = z.object({
  schoolId: z.string().optional(),
});

export const opsChaptersQuerySchema = z.object({
  schoolId: z.string({ required_error: 'schoolId is required' }).min(1),
  class: z.string({ required_error: 'class is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
});

export const rejectMockTestSchema = z.object({
  reason: z.string().trim().optional(),
});

export const submitMockTestSchema = z.object({
  childId: z.string({ required_error: 'childId is required' }).min(1),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedOptionIndex: z.number().int().min(0),
  })),
});

export const parentTestsQuerySchema = z.object({
  childId: z.string({ required_error: 'childId is required' }).min(1),
});

export type GenerateMockTestInput = z.infer<typeof generateMockTestSchema>;
export type CreateMockTestInput = z.infer<typeof createMockTestSchema>;
export type UpdateMockTestInput = z.infer<typeof updateMockTestSchema>;
export type ListMockTestsInput = z.infer<typeof listMockTestsSchema>;
export type RejectMockTestInput = z.infer<typeof rejectMockTestSchema>;
export type SubmitMockTestInput = z.infer<typeof submitMockTestSchema>;
