import { z } from 'zod';

const studentIdSchema = z.string({ required_error: 'Student ID is required' }).min(1);

export const initiateCallSchema = z.object({
  studentId: studentIdSchema,
});

export const createNoteSchema = z.object({
  studentId: studentIdSchema,
  note: z.string({ required_error: 'Note content is required' }).min(1).max(5000),
});

export const sendWhatsAppSchema = z.object({
  studentId: studentIdSchema,
  message: z.string({ required_error: 'Message is required' }).min(1).max(4096),
});

// Called by n8n to update a communication record
export const webhookCallbackSchema = z.object({
  communicationId: z.string().min(1),
  status: z.enum(['RUNNING', 'PROCESSING', 'COMPLETED', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED']),
  summary: z.string().optional(),
  recommendation: z.string().optional(),
  nextFollowUp: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateCommunicationSchema = z.object({
  status: z.enum([
    'QUEUED', 'PENDING', 'RUNNING', 'PROCESSING',
    'COMPLETED', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED',
  ]).optional(),
  summary: z.string().max(10000).optional(),
  recommendation: z.string().max(2000).optional(),
  nextFollowUp: z.string().max(200).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  type: z.enum(['call', 'whatsapp', 'note', 'email', 'sms', 'broadcast']).optional(),
  status: z.enum([
    'QUEUED', 'PENDING', 'RUNNING', 'PROCESSING',
    'COMPLETED', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type InitiateCallInput = z.infer<typeof initiateCallSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type SendWhatsAppInput = z.infer<typeof sendWhatsAppSchema>;
export type WebhookCallbackInput = z.infer<typeof webhookCallbackSchema>;
export type UpdateCommunicationInput = z.infer<typeof updateCommunicationSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
