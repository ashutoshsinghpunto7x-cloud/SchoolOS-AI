import { z } from 'zod';
import { createStudentSchema } from '../../students/student.validation';
import { IValidator, RowValidationResult } from './validator.interface';
import { resolveClassSection, normalizeGenderAbbrev } from './shared-helpers';

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
    // Normalise gender — accepts "M"/"F"/"O" as well as the full words.
    if (typeof processed.gender === 'string' && processed.gender.trim()) {
      processed.gender = normalizeGenderAbbrev(processed.gender);
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

    // Accepts either a single combined Class column ("NUR-A") or already-
    // separate Class + Section columns — see shared-helpers.ts.
    let sectionInferred = false;
    const resolved = resolveClassSection(processed.class, processed.section);
    if (resolved) {
      processed.class = resolved.class;
      processed.section = resolved.section;
      sectionInferred = resolved.inferred;
    }

    const result = createStudentSchema.safeParse(processed);

    if (result.success) {
      // Section-inferred-from-class is purely informational (the row's data is
      // complete and correct, just derived rather than in its own column) — it
      // must not count as a "needs attention" row. Surface it in `warnings` for
      // visibility, but the row's status is 'valid' either way.
      return {
        status: 'valid',
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
