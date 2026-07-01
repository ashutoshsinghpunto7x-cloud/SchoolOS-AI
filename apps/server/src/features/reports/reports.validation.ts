import { z } from 'zod';

const CATEGORIES = ['students', 'attendance', 'fees', 'admissions', 'timetable', 'calendar'] as const;

export const analyticsQuerySchema = z.object({
  category:    z.enum(CATEGORIES),
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
  class:       z.string().optional(),
  section:     z.string().optional(),
  academicYear:z.string().optional(),
});

export const saveReportSchema = z.object({
  name:        z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  category:    z.enum(CATEGORIES),
  filters:     z.object({
    dateFrom:     z.string().optional(),
    dateTo:       z.string().optional(),
    class:        z.string().optional(),
    section:      z.string().optional(),
    academicYear: z.string().optional(),
  }).default({}),
  isPublic: z.boolean().default(false),
});
