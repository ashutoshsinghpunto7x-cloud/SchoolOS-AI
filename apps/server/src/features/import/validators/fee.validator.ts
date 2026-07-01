import { z } from 'zod';
import { createFeeRecordSchema } from '../../fees/fee.validation';
import { IValidator, RowValidationResult } from './validator.interface';

export const feeValidator: IValidator = {
  importType: 'fees',

  fieldLabels: {
    studentId: 'Student ID',
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

    const result = createFeeRecordSchema.safeParse(processed);

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
