import { z } from 'zod';

/**
 * Ops "Create School" — onboards a brand-new tenant. Purely additive: it only ever
 * inserts a NEW SchoolSettings + a NEW school-admin User under a freshly generated schoolId.
 */
export const createSchoolSchema = z.object({
  schoolName: z.string().trim().min(2, 'School name is required').max(120),
  /** Optional short code used to build the schoolId (e.g. "abc" -> school_abc). Derived from the name if omitted. */
  schoolCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]{2,20}$/, 'School code must be 2-20 letters/digits')
    .optional(),
  adminFirstName: z.string().trim().min(1).max(60),
  adminLastName: z.string().trim().min(1).max(60),
  adminEmail: z.string().trim().toLowerCase().email(),
  adminPhone: z.string().trim().max(20).optional(),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
