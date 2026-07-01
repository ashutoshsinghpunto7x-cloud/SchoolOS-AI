import { z } from 'zod';

const JOB_TYPES = [
  'VOICE_CALL', 'WHATSAPP', 'EMAIL', 'SMS',
  'FEE_REMINDER', 'PTM_REMINDER', 'GENERAL_BROADCAST', 'CUSTOM',
] as const;

const JOB_STATUSES = [
  'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING',
] as const;

export const listJobsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  type: z.enum(JOB_TYPES).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const webhookCallbackSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  result: z.record(z.unknown()).optional(),
  errorMessage: z.string().optional(),
});

export type ListJobsInput = z.infer<typeof listJobsSchema>;
export type WebhookCallbackInput = z.infer<typeof webhookCallbackSchema>;
