import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Message is too long'),
  // Last few text turns, so a short follow-up ("and for class 7?") can be understood.
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().max(1500) }))
    .max(6)
    .optional(),
});

export type ChatInput = z.infer<typeof chatSchema>;
