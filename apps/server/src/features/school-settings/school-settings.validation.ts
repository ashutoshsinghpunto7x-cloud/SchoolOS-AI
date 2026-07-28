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

export const updateAttendanceEditPolicySchema = z.object({
  cutoffTime: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v), {
      message: 'Must be a 24-hour HH:mm time (e.g. 18:00), or omitted to disable the cutoff',
    }),
});

export const updateReportCardBrandingSchema = z.object({
  motto:                 z.string().trim().max(200).optional(),
  address:               z.string().trim().max(300).optional(),
  phone:                 z.string().trim().max(30).optional(),
  website:               z.string().trim().max(200).optional(),
  email:                 z.string().trim().email().optional().or(z.literal('')),
  principalName:         z.string().trim().max(100).optional(),
});

export const updateCommunicationSettingsSchema = z
  .object({
    whatsappEnabled:       z.boolean(),
    emailEnabled:          z.boolean(),
    smsEnabled:            z.boolean(),
    pushEnabled:           z.boolean(),
    attendanceAutoNotify:  z.boolean(),
    feeReminderAutoNotify: z.boolean(),
    workingHoursStart:     hhmm,
    workingHoursEnd:       hhmm,
    dailyLimit:            z.coerce.number().int().min(1).max(100000),
    retryCount:            z.coerce.number().int().min(0).max(10),
  })
  .refine((v) => v.workingHoursStart < v.workingHoursEnd, {
    message: 'workingHoursStart must be before workingHoursEnd',
    path: ['workingHoursEnd'],
  });

export type UpdateAttendanceRulesInput = z.infer<typeof updateAttendanceRulesSchema>;
export type UpdatePayrollConfigInput   = z.infer<typeof updatePayrollConfigSchema>;
export type UpdateBehaviorWindowInput  = z.infer<typeof updateBehaviorWindowSchema>;
export type UpdateAttendanceEditPolicyInput = z.infer<typeof updateAttendanceEditPolicySchema>;
export type UpdateReportCardBrandingInput = z.infer<typeof updateReportCardBrandingSchema>;
export type UpdateCommunicationSettingsInput = z.infer<typeof updateCommunicationSettingsSchema>;
