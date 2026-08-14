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

export const chapterCaptureUsageQuerySchema = z.object({
  schoolId: z.string().optional(),
  userId:   z.string().optional(),
  from:     z.string().optional(),
  to:       z.string().optional(),
});

export type ChapterCaptureUsageQuery = z.infer<typeof chapterCaptureUsageQuerySchema>;

export const feeReceiptWhatsappQuerySchema = z.object({
  schoolId:  z.string().optional(),
  studentId: z.string().optional(),
  createdBy: z.string().optional(),
  status:    z.enum(['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED']).optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
});

export type FeeReceiptWhatsappQuery = z.infer<typeof feeReceiptWhatsappQuerySchema>;

export const updateAlertSchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  assignedToUserId: z.string().optional(),
  assignedToName: z.string().optional(),
  note: z.string().max(1000).optional(),
});

export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
