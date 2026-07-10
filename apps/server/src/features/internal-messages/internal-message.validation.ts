import { z } from 'zod';

export const sendInternalMessageSchema = z
  .object({
    recipientUserIds: z.array(z.string().min(1)).optional(),
    recipientRole: z.enum(['admin', 'principal', 'reception', 'teacher', 'accountant']).optional(),
    subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
    body: z.string({ required_error: 'body is required' }).min(1).trim(),
    priority: z.enum(['normal', 'high']).default('normal'),
    templateId: z.string().optional(),
  })
  .refine(
    (data) => (data.recipientUserIds && data.recipientUserIds.length > 0) || !!data.recipientRole,
    { message: 'Select at least one recipient or a recipient role', path: ['recipientUserIds'] }
  );

export type SendInternalMessageInput = z.infer<typeof sendInternalMessageSchema>;

export const createMessageTemplateSchema = z.object({
  title: z.string({ required_error: 'title is required' }).min(1).trim(),
  subject: z.string({ required_error: 'subject is required' }).min(1).trim(),
  body: z.string({ required_error: 'body is required' }).min(1).trim(),
  priority: z.enum(['normal', 'high']).default('normal'),
});

export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateSchema>;
