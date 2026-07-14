import { z } from 'zod';
import { createFeeRecordSchema } from '../../fees/fee.validation';
import { IValidator, RowValidationResult } from './validator.interface';

// Real school fee sheets almost never carry the internal MongoDB studentId —
// they identify a student by Admission Number, exactly like every other
// import type. Accept either: `admissionNumber` gets resolved to the real
// studentId by the processor at process time (it needs a DB lookup, which
// validators — pure functions — can't do); `studentId` stays supported for
// power users / re-imports of SchoolOS's own export format.
const importFeeRecordSchema = createFeeRecordSchema
  .omit({ studentId: true })
  .extend({
    studentId: z.string().min(1).optional(),
    admissionNumber: z.string().min(1).optional(),
  })
  .refine((d) => !!d.studentId || !!d.admissionNumber, {
    message: 'Either Student ID or Admission Number is required',
    path: ['admissionNumber'],
  });

// Indian school sheets almost always write dates DD-MM-YY(YY) rather than
// ISO — same normalization as the student importer's DOB handling.
function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return s;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (m[3].length === 2) {
    const currentYY = new Date().getFullYear() % 100;
    year = year <= currentYY ? 2000 + year : 1900 + year;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return s;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const feeValidator: IValidator = {
  importType: 'fees',

  fieldLabels: {
    studentId: 'Student ID',
    admissionNumber: 'Admission Number',
    feeHead: 'Fee Head',
    customHead: 'Custom Head',
    description: 'Description',
    academicYear: 'Academic Year',
    month: 'Month',
    dueDate: 'Due Date',
    totalAmount: 'Total Amount',
    discountAmount: 'Discount Amount',
    discountReason: 'Discount Reason',
    notes: 'Notes',
  },

  validate(mappedData: Record<string, unknown>): RowValidationResult {
    const processed: Record<string, unknown> = { ...mappedData };

    // Normalise feeHead to lowercase
    if (typeof processed.feeHead === 'string') {
      processed.feeHead = processed.feeHead.toLowerCase().trim().replace(/\s+/g, '_');
    }
    // Coerce amount fields
    for (const field of ['totalAmount', 'discountAmount']) {
      if (typeof processed[field] === 'string' && processed[field] !== '') {
        processed[field] = Number(processed[field]);
      }
    }
    if (typeof processed.dueDate === 'string') {
      processed.dueDate = normalizeDate(processed.dueDate);
    }
    if (typeof processed.admissionNumber === 'string') {
      processed.admissionNumber = processed.admissionNumber.trim();
    }

    const result = importFeeRecordSchema.safeParse(processed);

    if (result.success) {
      return {
        status: 'valid',
        errors: [],
        warnings: [],
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
