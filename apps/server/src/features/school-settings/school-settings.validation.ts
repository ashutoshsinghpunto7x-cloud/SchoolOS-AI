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

export const updateBehaviorWindowSchema = z
  .object({
    startTime: hhmm,
    endTime:   hhmm,
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'startTime must be before endTime',
    path: ['endTime'],
  });

export const updateReportCardBrandingSchema = z.object({
  motto:                 z.string().trim().max(200).optional(),
  address:               z.string().trim().max(300).optional(),
  phone:                 z.string().trim().max(30).optional(),
  website:               z.string().trim().max(200).optional(),
  email:                 z.string().trim().email().optional().or(z.literal('')),
  principalName:         z.string().trim().max(100).optional(),
});

export type UpdateAttendanceRulesInput = z.infer<typeof updateAttendanceRulesSchema>;
export type UpdatePayrollConfigInput   = z.infer<typeof updatePayrollConfigSchema>;
export type UpdateBehaviorWindowInput  = z.infer<typeof updateBehaviorWindowSchema>;
export type UpdateReportCardBrandingInput = z.infer<typeof updateReportCardBrandingSchema>;
