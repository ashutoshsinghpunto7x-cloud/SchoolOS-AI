import { z } from 'zod';

export const sendMessageToTeachersSchema = z.object({
  teacherIds: z
    .array(z.string().min(1))
    .min(1, 'Select at least one teacher'),
  title: z.string({ required_error: 'title is required' }).min(1).trim(),
  message: z.string({ required_error: 'message is required' }).min(1).trim(),
});

export const updateCallStatusSchema = z.object({
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
  status: z.enum(['will_pay', 'no_answer', 'not_reached']),
});

export type SendMessageToTeachersInput = z.infer<typeof sendMessageToTeachersSchema>;
export type UpdateCallStatusInput = z.infer<typeof updateCallStatusSchema>;
