import { z } from 'zod';

export const scheduleMaintenanceSchema = z
  .object({
    startAt: z.coerce.date({ required_error: 'startAt is required' }),
    endAt: z.coerce.date({ required_error: 'endAt is required' }),
    message: z.string().min(1, 'message is required').max(1000),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });

export const toggleMaintenanceSchema = z.object({
  isActive: z.boolean(),
  message: z.string().max(1000).optional(),
});

export type ScheduleMaintenanceInput = z.infer<typeof scheduleMaintenanceSchema>;
export type ToggleMaintenanceInput = z.infer<typeof toggleMaintenanceSchema>;
