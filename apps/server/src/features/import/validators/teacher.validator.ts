import { z } from 'zod';
import { createTeacherSchema } from '../../teachers/teacher.validation';
import { IValidator, RowValidationResult } from './validator.interface';

export const teacherValidator: IValidator = {
  importType: 'teachers',

  fieldLabels: {
    fullName: 'Full Name',
    gender: 'Gender',
    dateOfBirth: 'Date of Birth',
    phone: 'Phone',
    alternatePhone: 'Alternate Phone',
    email: 'Email',
    address: 'Address',
    department: 'Department',
    subjects: 'Subjects',
    assignedClasses: 'Assigned Classes',
    experienceYears: 'Experience Years',
    joiningDate: 'Joining Date',
    employmentStatus: 'Employment Status',
    tags: 'Tags',
    remarks: 'Remarks',
  },

  validate(mappedData: Record<string, unknown>): RowValidationResult {
    const processed: Record<string, unknown> = { ...mappedData };

    // Normalise gender
    if (typeof processed.gender === 'string') {
      processed.gender = processed.gender.toLowerCase().trim();
    }
    // subjects / assignedClasses / tags: comma-separated string → array
    for (const field of ['subjects', 'assignedClasses', 'tags']) {
      if (typeof processed[field] === 'string' && processed[field]) {
        processed[field] = (processed[field] as string).split(',').map((v: string) => v.trim()).filter(Boolean);
      } else if (!processed[field]) {
        processed[field] = [];
      }
    }
    // experienceYears: coerce string → number
    if (typeof processed.experienceYears === 'string' && processed.experienceYears !== '') {
      processed.experienceYears = Number(processed.experienceYears);
    }
    // Default employmentStatus
    if (!processed.employmentStatus) {
      processed.employmentStatus = 'applicant';
    }

    const result = createTeacherSchema.safeParse(processed);

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
