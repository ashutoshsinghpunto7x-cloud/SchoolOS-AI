import { ImportType } from '../import-session.model';
import { IProcessor } from './processor.interface';
import { studentProcessor } from './student.processor';
import { teacherProcessor } from './teacher.processor';
import { feeProcessor } from './fee.processor';
import { enquiryProcessor } from './enquiry.processor';
import { attendanceProcessor } from './attendance.processor';

/**
 * Registry maps each import type to its processor.
 * Adding a new import type (e.g. timetable):
 *   1. Implement IProcessor in a new file
 *   2. Add an entry here — zero other files change.
 */
const PROCESSORS: Record<ImportType, IProcessor> = {
  students: studentProcessor,
  teachers: teacherProcessor,
  fees: feeProcessor,
  admissions: enquiryProcessor,
  attendance: attendanceProcessor,
};

export const getProcessor = (importType: ImportType): IProcessor => {
  const processor = PROCESSORS[importType];
  if (!processor) throw new Error(`No processor registered for import type: ${importType}`);
  return processor;
};

export const processorRegistry = PROCESSORS;
