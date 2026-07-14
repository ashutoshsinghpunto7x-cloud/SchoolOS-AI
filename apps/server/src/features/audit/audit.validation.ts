import { z } from 'zod';

export const listAuditSchema = z.object({
  resource:   z.string().optional(),
  resourceId: z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(500).default(100),
});

export type ListAuditInput = z.infer<typeof listAuditSchema>;
