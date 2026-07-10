import { z } from 'zod';

export const createSchoolClassSchema = z.object({
  name: z.string({ required_error: 'Class name is required' }).min(1).max(30).trim(),
});

export const sectionSchema = z.object({
  section: z.string({ required_error: 'Section is required' }).min(1).max(10).trim().toUpperCase(),
});

export type CreateSchoolClassInput = z.infer<typeof createSchoolClassSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
