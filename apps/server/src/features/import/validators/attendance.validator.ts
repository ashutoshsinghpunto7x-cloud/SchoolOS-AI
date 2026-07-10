import { z } from 'zod';
import { IValidator, RowValidationResult } from './validator.interface';

// Accepts common register shorthand so schools can upload sheets that already
// use single-letter or human-written status columns without reformatting first.
const STATUS_ALIASES: Record<string, string> = {
  p: 'present', present: 'present',
  a: 'absent', absent: 'absent',
  l: 'late', late: 'late',
  hd: 'half_day', 'half day': 'half_day', half_day: 'half_day', halfday: 'half_day',
  lv: 'leave_approved', leave: 'leave_approved', 'leave approved': 'leave_approved', leave_approved: 'leave_approved',
};

function normalizeDate(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY, the common register format
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return trimmed; // let schema validation reject it with a clear error
}

const importAttendanceRowSchema = z.object({
  admissionNumber: z.string({ required_error: 'Admission Number is required' }).min(1, 'Admission Number is required').trim(),
  class: z.string({ required_error: 'Class is required' }).min(1, 'Class is required').trim(),
  section: z.string({ required_error: 'Section is required' }).min(1, 'Section is required').trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be a valid date (e.g. 2024-04-15 or 15/04/2024)'),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'leave_approved'], {
    errorMap: () => ({ message: 'Status must be one of: Present, Absent, Late, Half Day, Leave' }),
  }),
  note: z.string().max(500).trim().optional().or(z.literal('')),
});

export const attendanceValidator: IValidator = {
  importType: 'attendance',

  fieldLabels: {
    admissionNumber: 'Admission Number',
    class: 'Class',
    section: 'Section',
    date: 'Date',
    status: 'Status',
    note: 'Note',
  },

  validate(mappedData: Record<string, unknown>): RowValidationResult {
    const processed: Record<string, unknown> = { ...mappedData };

    if (typeof processed.class === 'string') processed.class = processed.class.trim();
    if (typeof processed.section === 'string') processed.section = processed.section.trim().toUpperCase();
    processed.date = normalizeDate(processed.date);

    if (typeof processed.status === 'string') {
      const key = processed.status.trim().toLowerCase();
      processed.status = STATUS_ALIASES[key] ?? key;
    }

    const result = importAttendanceRowSchema.safeParse(processed);

    if (result.success) {
      return { status: 'valid', errors: [], warnings: [], cleanData: result.data as Record<string, unknown> };
    }

    const errors = result.error.issues.map((issue: z.ZodIssue) => ({
      field: issue.path.join('.') || 'unknown',
      message: issue.message,
      code: issue.code,
    }));

    return { status: 'error', errors, warnings: [], cleanData: processed };
  },
};
