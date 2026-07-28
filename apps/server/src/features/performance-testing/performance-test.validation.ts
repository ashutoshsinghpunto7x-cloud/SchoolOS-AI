import { z } from 'zod';

export const startPerformanceTestSchema = z.object({
  vus: z.coerce.number().int().min(1).max(500),
  durationMinutes: z.coerce.number().min(1).max(30),
  label: z.string().trim().min(1).max(120).optional(),
});

export type StartPerformanceTestInput = z.infer<typeof startPerformanceTestSchema>;

export const performanceTestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
