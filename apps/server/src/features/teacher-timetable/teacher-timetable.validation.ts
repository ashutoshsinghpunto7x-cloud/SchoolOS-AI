import { z } from 'zod';

export const teacherTimetableEntrySchema = z.object({
  dayOfWeek:   z.number().int().min(1).max(6),
  slotId:      z.string().min(1),
  subjectName: z.string().trim().min(1).max(100),
  class:       z.string().trim().max(20).optional(),
  section:     z.string().trim().max(10).optional(),
  roomNumber:  z.string().trim().max(50).optional(),
});

export const getOrCreateTeacherTimetableSchema = z.object({
  teacherId:    z.string().min(1),
  teacherName:  z.string().trim().min(1).max(100),
  academicYear: z.string().trim().min(1).max(20),
});

export const bulkUpdateTeacherTimetableEntriesSchema = z.object({
  entries: z.array(teacherTimetableEntrySchema).max(72),
});

export const updateTeacherTimetableStatusSchema = z.object({
  status: z.enum(['draft', 'published']),
});
