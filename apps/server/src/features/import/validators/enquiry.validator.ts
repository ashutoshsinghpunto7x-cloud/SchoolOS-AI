import { z } from 'zod';
import { createEnquirySchema } from '../../enquiries/enquiry.validation';
import { IValidator, RowValidationResult } from './validator.interface';
import { normalizeGenderAbbrev } from './shared-helpers';

export const enquiryValidator: IValidator = {
  importType: 'admissions',

  fieldLabels: {
    studentName: 'Student Name',
    studentDateOfBirth: 'Student Date of Birth',
    interestedClass: 'Interested Class',
    gender: 'Gender',
    currentSchool: 'Current School',
    currentClass: 'Current Class',
    parentName: 'Parent Name',
    parentPhone: 'Parent Phone',
    alternatePhone: 'Alternate Phone',
    parentEmail: 'Parent Email',
    stage: 'Stage',
    source: 'Source',
    referredBy: 'Referred By',
    assignedCounsellor: 'Assigned Counsellor',
    followUpDate: 'Follow-Up Date',
    tags: 'Tags',
    remarks: 'Remarks',
  },

  validate(mappedData: Record<string, unknown>): RowValidationResult {
    const processed: Record<string, unknown> = { ...mappedData };

    // Normalise gender — accepts "M"/"F"/"O" as well as the full words.
    if (typeof processed.gender === 'string' && processed.gender.trim()) {
      processed.gender = normalizeGenderAbbrev(processed.gender);
    } else if (typeof processed.gender === 'string') {
      processed.gender = undefined;
    }
    // Normalise stage / source to snake_case lowercase
    for (const field of ['stage', 'source']) {
      if (typeof processed[field] === 'string') {
        processed[field] = (processed[field] as string).toLowerCase().trim().replace(/\s+/g, '_');
      }
    }
    // Default source if missing
    if (!processed.source) processed.source = 'other';
    // Default stage
    if (!processed.stage) processed.stage = 'new_enquiry';
    // Tags
    if (typeof processed.tags === 'string' && processed.tags) {
      processed.tags = (processed.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean);
    } else if (!processed.tags) {
      processed.tags = [];
    }

    const result = createEnquirySchema.safeParse(processed);

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
