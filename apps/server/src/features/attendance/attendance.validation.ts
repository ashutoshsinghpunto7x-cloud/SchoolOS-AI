import { z } from 'zod';

export const ATTENDANCE_STATUSES = [
  'present', 'absent', 'late', 'half_day', 'leave_approved',
] as const;

// ── ISO date helper ───────────────────────────────────────────────────────────

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

// ── Single record ─────────────────────────────────────────────────────────────

export const singleAttendanceSchema = z.object({
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
  class:     z.string({ required_error: 'class is required' }).min(1).trim(),
  section:   z.string({ required_error: 'section is required' }).min(1).trim(),
  date:      isoDate,
  status:    z.enum(ATTENDANCE_STATUSES, { required_error: 'status is required' }),
  note:      z.string().max(500).optional(),
});

// ── Bulk submission ───────────────────────────────────────────────────────────

export const bulkAttendanceSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  section: z.string({ required_error: 'section is required' }).min(1).trim(),
  date:    isoDate,
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status:    z.enum(ATTENDANCE_STATUSES),
        note:      z.string().max(500).optional(),
      })
    )
    .min(1, 'At least one record required')
    .max(200, 'Max 200 records per submission'),
});

// ── Update single ─────────────────────────────────────────────────────────────

export const updateAttendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  note:   z.string().max(500).optional(),
});

// ── List / filter query ───────────────────────────────────────────────────────

export const listAttendanceSchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(500).default(50),
  date:      isoDate.optional(),
  dateFrom:  isoDate.optional(),
  dateTo:    isoDate.optional(),
  class:     z.string().optional(),
  section:   z.string().optional(),
  status:    z.enum(ATTENDANCE_STATUSES).optional(),
  studentId: z.string().optional(),
  search:    z.string().optional(),
});

// ── Student history ───────────────────────────────────────────────────────────

export const studentHistorySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(400).default(30),
  dateFrom: isoDate.optional(),
  dateTo:   isoDate.optional(),
  status:   z.enum(ATTENDANCE_STATUSES).optional(),
});

// ── Class attendance (load all for a class+date) ──────────────────────────────

export const classAttendanceSchema = z.object({
  date: isoDate.optional(),   // defaults to today
});

// ── Summary query ─────────────────────────────────────────────────────────────

export const summarySchema = z.object({
  studentId: z.string().optional(),
  class:     z.string().optional(),
  section:   z.string().optional(),
  dateFrom:  isoDate.optional(),
  dateTo:    isoDate.optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type SingleAttendanceInput  = z.infer<typeof singleAttendanceSchema>;
export type BulkAttendanceInput    = z.infer<typeof bulkAttendanceSchema>;
export type UpdateAttendanceInput  = z.infer<typeof updateAttendanceSchema>;
export type ListAttendanceInput    = z.infer<typeof listAttendanceSchema>;
export type StudentHistoryInput    = z.infer<typeof studentHistorySchema>;
export type ClassAttendanceInput   = z.infer<typeof classAttendanceSchema>;
export type SummaryInput           = z.infer<typeof summarySchema>;
