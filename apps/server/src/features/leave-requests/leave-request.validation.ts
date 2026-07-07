import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createLeaveRequestSchema = z
  .object({
    leaveType: z.enum(['full_day', 'half_day']),
    dateFrom: dateStr,
    dateTo: dateStr,
    reason: z.string().min(1, 'Reason is required').max(500).trim(),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'dateTo must be on or after dateFrom',
    path: ['dateTo'],
  })
  .refine((data) => data.leaveType !== 'half_day' || data.dateFrom === data.dateTo, {
    message: 'Half-day leave can only be requested for a single date',
    path: ['dateTo'],
  });

export const rejectLeaveRequestSchema = z.object({
  reviewNote: z.string().max(300).trim().optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type RejectLeaveRequestInput = z.infer<typeof rejectLeaveRequestSchema>;
