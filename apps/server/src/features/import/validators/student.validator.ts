import { z } from 'zod';
import { createStudentSchema } from '../../students/student.validation';
import { IValidator, RowValidationResult } from './validator.interface';

// Some source spreadsheets combine class and section into one column
// (e.g. "Mont-A", "10-A", "9B") instead of providing a separate Section
// column. Since `section` is required, that leaves every row unmatched
// and failing validation even though the data is really there — split it
// out so those imports don't get rejected wholesale.
function splitClassSection(classRaw: string): { klass: string; section: string } | null {
  const trimmed = classRaw.trim();
  const withSeparator = trimmed.match(/^(.+?)[\s\-_/]+([A-Za-z]{1,3})$/);
  if (withSeparator) return { klass: withSeparator[1].trim(), section: withSeparator[2].trim() };
  const tight = trimmed.match(/^(\d+)([A-Za-z]{1,3})$/);
  if (tight) return { klass: tight[1], section: tight[2] };
  return null;
}

// The Student model stores dateOfBirth as a Date, but Indian-format source
// sheets almost always write it as DD-MM-YY / DD-MM-YYYY (e.g. "30-10-22").
// Mongoose can't cast those, so the row would throw during creation. Convert
// day-first strings to an ISO YYYY-MM-DD that casts cleanly; leave anything
// already ISO (or unrecognised) untouched so nothing else regresses.
function normalizeDob(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  // Already ISO (YYYY-MM-DD) — keep as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return s; // unknown format — don't guess, let it flow through unchanged

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (m[3].length === 2) {
    // 2-digit year: 20YY if that lands on/before the current year, else 19YY.
    const currentYY = new Date().getFullYear() % 100;
    year = year <= currentYY ? 2000 + year : 1900 + year;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return s; // implausible — leave alone

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const studentValidator: IValidator = {
  importType: 'students',

  fieldLabels: {
    admissionNumber: 'Admission Number',
    fullName: 'Full Name',
    rollNumber: 'Roll Number',
    class: 'Class',
    section: 'Section',
    gender: 'Gender',
    dateOfBirth: 'Date of Birth',
    fatherName: 'Father Name',
    motherName: 'Mother Name',
    parentPhone: 'Parent Phone',
    alternatePhone: 'Alternate Phone',
    email: 'Email',
    address: 'Address',
    locality: 'Locality',
    admissionStatus: 'Admission Status',
    tags: 'Tags',
    remarks: 'Remarks',
  },

  validate(mappedData: Record<string, unknown>): RowValidationResult {
    // Pre-process: convert comma-separated tags string to array
    const processed: Record<string, unknown> = { ...mappedData };
    if (typeof processed.tags === 'string' && processed.tags) {
      processed.tags = processed.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    // Normalise gender to lowercase
    if (typeof processed.gender === 'string') {
      processed.gender = processed.gender.toLowerCase().trim();
    }
    // Normalise day-first / 2-digit-year dates to an ISO string the Date column
    // can actually cast (source sheets commonly use "30-10-22" style DOBs).
    if (typeof processed.dateOfBirth === 'string') {
      processed.dateOfBirth = normalizeDob(processed.dateOfBirth);
    }
    // Normalise admissionStatus if absent → default 'active'
    if (!processed.admissionStatus) {
      processed.admissionStatus = 'active';
    }

    // Derive section from a combined class value when no section was mapped
    let sectionInferred = false;
    if (
      (!processed.section || processed.section === '') &&
      typeof processed.class === 'string'
    ) {
      const split = splitClassSection(processed.class);
      if (split) {
        processed.class = split.klass;
        processed.section = split.section;
        sectionInferred = true;
      }
    }

    const result = createStudentSchema.safeParse(processed);

    if (result.success) {
      return {
        status: sectionInferred ? 'warning' : 'valid',
        errors: [],
        warnings: sectionInferred
          ? [{ field: 'section', message: `Section "${result.data.section}" inferred from class value`, code: 'inferred' }]
          : [],
        cleanData: result.data as Record<string, unknown>,
      };
    }

    const errors = result.error.issues.map((issue: z.ZodIssue) => ({
      field: issue.path.join('.') || 'unknown',
      message: issue.message,
      code: issue.code,
    }));

    return { status: 'error', errors, warnings: [], cleanData: processed };
  },
};
