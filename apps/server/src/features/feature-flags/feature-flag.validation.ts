import { z } from 'zod';

const keySchema = z
  .string({ required_error: 'key is required' })
  .min(2)
  .max(60)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'key must be a lowercase slug, e.g. "attendance-v2"');

export const createFeatureSchema = z.object({
  key: keySchema,
  name: z.string({ required_error: 'name is required' }).min(1).max(120),
  description: z.string().max(2000).optional(),
  version: z.string().max(40).optional(),
});

export const updateFeatureSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  version: z.string().max(40).optional(),
  status: z.enum(['enabled', 'disabled', 'maintenance', 'beta', 'deprecated']).optional(),
  visibilityMode: z.enum(['nobody', 'everyone', 'custom']).optional(),
  rolloutPercentage: z.coerce.number().int().min(0).max(100).optional(),
  enableFrom: z.coerce.date().nullable().optional(),
  disableOn: z.coerce.date().nullable().optional(),
});

export const createAssignmentSchema = z.object({
  targetType: z.enum(['user', 'role', 'school', 'segment']),
  targetId: z.string({ required_error: 'targetId is required' }).min(1).max(200),
});

export const updateTesterFlagsSchema = z.object({
  isDeveloper: z.boolean().optional(),
  isInternalTester: z.boolean().optional(),
});

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateTesterFlagsInput = z.infer<typeof updateTesterFlagsSchema>;
