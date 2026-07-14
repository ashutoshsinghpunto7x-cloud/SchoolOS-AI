import { z } from 'zod';

const IMPORT_TYPES = ['students', 'teachers', 'fees', 'admissions', 'attendance'] as const;
const IMPORT_STATUSES = [
  'uploading', 'parsing', 'validating', 'preview', 'confirmed',
  'processing', 'completed', 'failed', 'cancelled', 'rolled_back',
] as const;

export const listSessionsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  importType: z.enum(IMPORT_TYPES).optional(),
  status: z.enum(IMPORT_STATUSES).optional(),
});

export const listRowsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  status: z.enum(['pending', 'valid', 'warning', 'error', 'imported', 'skipped']).optional(),
});

export const uploadSessionSchema = z.object({
  importType: z.enum(IMPORT_TYPES),
});

export const confirmMappingSchema = z.object({
  mapping: z.record(z.string()),
});

export const setDuplicateStrategySchema = z.object({
  strategy: z.enum(['skip', 'update', 'create']),
});

export const saveMappingTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const listMappingTemplatesSchema = z.object({
  importType: z.enum(IMPORT_TYPES).optional(),
});
