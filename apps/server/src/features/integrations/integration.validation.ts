import { z } from 'zod';

export const listIntegrationsSchema = z.object({
  providerType: z.string().optional(),
  status:       z.string().optional(),
});

export const listSyncLogsSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listWebhookDeliveriesSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
