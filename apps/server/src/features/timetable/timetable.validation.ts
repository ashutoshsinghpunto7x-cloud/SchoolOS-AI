import { z } from 'zod';

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM');

// ── Period Slots ──────────────────────────────────────────────────────────────

export const createPeriodSlotSchema = z.object({
  name:           z.string().trim().min(1).max(50),
  orderIndex:     z.number().int().min(0),
  startTime:      timeSchema,
  endTime:        timeSchema,
  isBreak:        z.boolean().default(false),
  daysApplicable: z.array(z.number().int().min(1).max(6)).min(1).default([1, 2, 3, 4, 5]),
});

export const updatePeriodSlotSchema = createPeriodSlotSchema.partial();

// ── Timetable Entry ───────────────────────────────────────────────────────────

export const timetableEntrySchema = z.object({
  dayOfWeek:   z.number().int().min(1).max(6),
  slotId:      z.string().min(1),
  subjectName: z.string().trim().min(1).max(100),
  teacherId:   z.string().optional(),
  teacherName: z.string().trim().max(100).optional(),
  roomNumber:  z.string().trim().max(50).optional(),
});

// ── Timetable ─────────────────────────────────────────────────────────────────

export const createTimetableSchema = z.object({
  class:        z.string().trim().min(1).max(20),
  section:      z.string().trim().min(1).max(10),
  academicYear: z.string().trim().min(1).max(20),
  term:         z.string().trim().max(50).optional(),
  notes:        z.string().max(2000).optional(),
});

export const updateTimetableSchema = createTimetableSchema.partial();

export const upsertEntrySchema = timetableEntrySchema;

export const bulkUpdateEntriesSchema = z.object({
  entries: z.array(timetableEntrySchema).max(72),
});

export const updateTimetableStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export const listTimetablesSchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  class:        z.string().optional(),
  section:      z.string().optional(),
  academicYear: z.string().optional(),
  status:       z.enum(['draft', 'published', 'archived']).optional(),
});

// ── Substitutes ───────────────────────────────────────────────────────────────

export const createSubstituteSchema = z.object({
  timetableId:           z.string().min(1),
  class:                 z.string().trim().min(1),
  section:               z.string().trim().min(1),
  date:                  z.string().min(1),
  dayOfWeek:             z.number().int().min(1).max(6),
  slotId:                z.string().min(1),
  subjectName:           z.string().trim().min(1).max(100),
  originalTeacherId:     z.string().optional(),
  originalTeacherName:   z.string().trim().max(100).optional(),
  substituteTeacherName: z.string().trim().min(1).max(100),
  substituteTeacherId:   z.string().optional(),
  reason:                z.string().trim().max(500).optional(),
  notes:                 z.string().max(1000).optional(),
});

export const updateSubstituteSchema = z.object({
  substituteTeacherName: z.string().trim().min(1).max(100).optional(),
  substituteTeacherId:   z.string().optional(),
  reason:                z.string().trim().max(500).optional(),
  notes:                 z.string().max(1000).optional(),
  status:                z.enum(['active', 'cancelled']).optional(),
});

export const listSubstitutesSchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  dateFrom:    z.string().optional(),
  dateTo:      z.string().optional(),
  class:       z.string().optional(),
  section:     z.string().optional(),
  timetableId: z.string().optional(),
});
