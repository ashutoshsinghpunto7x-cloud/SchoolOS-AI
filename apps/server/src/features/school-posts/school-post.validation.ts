import { z } from 'zod';
import { ACTIVITY_CATEGORIES, SCHOOL_POST_KINDS } from './school-post.model';

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Use a valid date');

// The form is multipart (photos), so every field arrives as a string and
// `classes` arrives as a JSON array.
const classesField = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return [];
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Classes are not readable' });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(z.object({ class: z.string().trim().min(1).max(30), section: z.string().trim().min(1).max(10) }))
      .max(80)
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const createSchoolPostSchema = z
  .object({
    kind: z.enum(SCHOOL_POST_KINDS),
    title: z.string().trim().min(3, 'Add a title of at least 3 characters').max(200),
    description: optionalText(2000),
    classes: classesField,
    subject: optionalText(100),
    dueDate: z.union([isoDay, z.literal('')]).optional().transform((v) => v || undefined),
    category: z.union([z.enum(ACTIVITY_CATEGORIES), z.literal('')]).optional().transform((v) => v || undefined),
    activityDate: z.union([isoDay, z.literal('')]).optional().transform((v) => v || undefined),
  })
  .superRefine((v, ctx) => {
    const need = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (v.kind === 'homework') {
      if (!v.subject) need('subject', 'Choose a subject');
      if (!v.dueDate) need('dueDate', 'Choose a due date');
      if (v.classes.length === 0) need('classes', 'Choose a class');
    }
    if (v.kind === 'activity') {
      if (!v.category) need('category', 'Choose an activity type');
      if (!v.activityDate) need('activityDate', 'Choose the activity date');
    }
  });

export type CreateSchoolPostInput = z.infer<typeof createSchoolPostSchema>;
