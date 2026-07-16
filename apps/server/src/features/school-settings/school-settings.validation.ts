import { z } from 'zod';

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be a 24-hour HH:mm time (e.g. 09:00)');

export const updateAttendanceRulesSchema = z.object({
  startTime:     hhmm,
  lateAfter:     hhmm,
  halfDayAfter:  hhmm,
  schoolEndTime: hhmm,
});

export const updatePayrollConfigSchema = z.object({
  workingDaysPerMonth: z.coerce.number().int().min(1).max(31),
});

export type UpdateAttendanceRulesInput = z.infer<typeof updateAttendanceRulesSchema>;
export type UpdatePayrollConfigInput   = z.infer<typeof updatePayrollConfigSchema>;
