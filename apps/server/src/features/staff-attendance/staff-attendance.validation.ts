import { z } from 'zod';

export const scanQrSchema = z.object({
  token: z.string({ required_error: 'QR token is required' }).min(1),
  device: z.string().max(100).optional(),
});

export const employeeHistoryQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const manualMarkSchema = z.object({
  employeeId: z.string({ required_error: 'employeeId is required' }).min(1),
  status: z.enum(['present', 'late', 'half_day', 'absent'], { required_error: 'status is required' }),
});

export type ScanQrInput            = z.infer<typeof scanQrSchema>;
export type EmployeeHistoryQuery   = z.infer<typeof employeeHistoryQuerySchema>;
export type ManualMarkInput        = z.infer<typeof manualMarkSchema>;
