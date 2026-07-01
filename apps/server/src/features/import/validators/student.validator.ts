import { z } from 'zod';
import { createStudentSchema } from '../../students/student.validation';
import { IValidator, RowValidationResult } from './validator.interface';

export const studentValidator: IValidator = {
  importType: 'students',

  fieldLabels: {
    fullName: 'Full Name',
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
    // Normalise admissionStatus if absent → default 'active'
    if (!processed.admissionStatus) {
      processed.admissionStatus = 'active';
    }

    const result = createStudentSchema.safeParse(processed);

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
