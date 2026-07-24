import { z } from 'zod';

export const auditTrailQuerySchema = z.object({
  schoolId:   z.string().optional(),
  userId:     z.string().optional(),
  action:     z.string().optional(),
  resource:   z.string().optional(),
  dateFrom:   z.string().optional(),
  dateTo:     z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(500).default(100),
});

export type AuditTrailQuery = z.infer<typeof auditTrailQuerySchema>;
