import { z } from 'zod';
import { MODULE_CATALOG_KEYS } from './module-catalog';

export const bulkSetRestrictionSchema = z
  .object({
    moduleKeys: z
      .array(z.string().refine((k) => MODULE_CATALOG_KEYS.includes(k), { message: 'Unknown module key' }))
      .min(1, 'Select at least one module'),
    restricted: z.boolean(),
    message: z.string().max(300).optional(),
    returnAt: z.coerce.date().nullable().optional(),
    showReturnTime: z.boolean().optional().default(false),
  })
  .refine((data) => !data.restricted || !data.showReturnTime || !!data.returnAt, {
    message: 'returnAt is required when showReturnTime is enabled',
    path: ['returnAt'],
  });

export type BulkSetRestrictionInput = z.infer<typeof bulkSetRestrictionSchema>;
