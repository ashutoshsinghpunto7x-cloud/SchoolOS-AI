import { z } from 'zod';

export const upsertOwnEntrySchema = z.object({
  class:       z.string().trim().min(1).max(20),
  section:     z.string().trim().min(1).max(10),
  dayOfWeek:   z.number().int().min(1).max(6),
  slotId:      z.string().min(1),
  subjectName: z.string().trim().min(1).max(100),
  roomNumber:  z.string().trim().max(50).optional(),
});

export const removeOwnEntrySchema = z.object({
  class:     z.string().trim().min(1).max(20),
  section:   z.string().trim().min(1).max(10),
  dayOfWeek: z.number().int().min(1).max(6),
  slotId:    z.string().min(1),
});

export type UpsertOwnEntryInput = z.infer<typeof upsertOwnEntrySchema>;
export type RemoveOwnEntryInput = z.infer<typeof removeOwnEntrySchema>;
