import { z } from 'zod';
import { updateStudentSchema } from '../students/student.validation';

export const createChangeRequestSchema = z.object({
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
  // Reuses the same field rules as a direct student update — only the
  // subset of fields actually being changed needs to be present.
  changes: updateStudentSchema.refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be changed' },
  ),
});

export const rejectChangeRequestSchema = z.object({
  reviewNote: z.string().max(300).trim().optional(),
});

export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;
export type RejectChangeRequestInput = z.infer<typeof rejectChangeRequestSchema>;
