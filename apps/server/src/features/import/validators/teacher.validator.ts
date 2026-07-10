import { z } from 'zod';
import { createTeacherSchema } from '../../teachers/teacher.validation';
import { IValidator, RowValidationResult } from './validator.interface';

// Every field createTeacherSchema recognizes — anything else in the mapped row
// gets swept into customFields instead of being silently dropped (Zod's default
// object behavior strips unrecognized keys with no trace).
const KNOWN_TEACHER_FIELDS = new Set([
  'fullName', 'gender', 'dateOfBirth', 'phone', 'alternatePhone', 'email', 'address',
  'department', 'subjects', 'assignedClasses', 'qualification', 'experienceYears',
  'joiningDate', 'employmentStatus', 'tags', 'remarks', 'emergencyContact', 'customFields',
]);

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

    // Sweep any unrecognized columns (Blood Group, Previous School, Aadhar No.,
    // etc.) into customFields instead of letting them get silently stripped.
    const customFields: Record<string, unknown> = { ...(processed.customFields as Record<string, unknown> | undefined) };
    for (const key of Object.keys(processed)) {
      if (!KNOWN_TEACHER_FIELDS.has(key)) {
        const value = processed[key];
        if (value !== undefined && value !== '') customFields[key] = value;
        delete processed[key];
      }
    }
    if (Object.keys(customFields).length) processed.customFields = customFields;

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
