import { z } from 'zod';

export const upsertClassTeacherSchema = z.object({
  class:     z.string({ required_error: 'class is required' }).min(1).max(20).trim(),
  section:   z.string({ required_error: 'section is required' }).min(1).max(10).trim(),
  teacherId: z.string({ required_error: 'teacherId is required' }).min(1),
});

export type UpsertClassTeacherInput = z.infer<typeof upsertClassTeacherSchema>;
