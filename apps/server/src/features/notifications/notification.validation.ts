import { z } from 'zod';

export const sendMessageToTeachersSchema = z.object({
  teacherIds: z
    .array(z.string().min(1))
    .min(1, 'Select at least one teacher'),
  title: z.string({ required_error: 'title is required' }).min(1).trim(),
  message: z.string({ required_error: 'message is required' }).min(1).trim(),
});

export type SendMessageToTeachersInput = z.infer<typeof sendMessageToTeachersSchema>;
