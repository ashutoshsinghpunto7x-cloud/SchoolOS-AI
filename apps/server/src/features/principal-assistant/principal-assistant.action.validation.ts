import { z } from 'zod';

export const previewActionSchema = z.union([
  z.object({ message: z.string().trim().min(1, 'Message is required').max(1000) }),
  z.object({ actionId: z.string().trim().min(1), params: z.record(z.unknown()) }),
]);

export type PreviewActionInput = z.infer<typeof previewActionSchema>;

export const executeActionSchema = z.object({
  actionId: z.string().trim().min(1),
  params: z.record(z.unknown()),
  confirmed: z.literal(true, { errorMap: () => ({ message: 'confirmed must be true' }) }),
});

export type ExecuteActionInput = z.infer<typeof executeActionSchema>;
