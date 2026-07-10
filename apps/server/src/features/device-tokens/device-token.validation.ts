import { z } from 'zod';

export const registerDeviceTokenSchema = z.object({
  token: z.string().trim().min(1, 'Push token is required').max(500),
  platform: z.enum(['ios', 'android']),
});

export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>;
