import { ImportType } from '../import-session.model';
import { IValidator } from './validator.interface';
import { studentValidator } from './student.validator';
import { teacherValidator } from './teacher.validator';
import { feeValidator } from './fee.validator';
import { enquiryValidator } from './enquiry.validator';

/**
 * Registry maps each import type to its validator.
 * Adding a new import type: implement IValidator and add an entry here.
 * No existing validators are modified.
 */
const VALIDATORS: Record<ImportType, IValidator> = {
  students: studentValidator,
  teachers: teacherValidator,
  fees: feeValidator,
  admissions: enquiryValidator,
};

export const getValidator = (importType: ImportType): IValidator => {
  const validator = VALIDATORS[importType];
  if (!validator) throw new Error(`No validator registered for import type: ${importType}`);
  return validator;
};

export const validatorRegistry = VALIDATORS;
