import { AuthContext } from '../../../lib/auth-context';
import { studentService } from '../../students/student.service';
import { studentRepository } from '../../students/student.repository';
import { IProcessor, ProcessRowResult, DuplicateAction } from './processor.interface';
import { logger } from '../../../lib/logger';

export const studentProcessor: IProcessor = {
  importType: 'students',

  async findDuplicate(cleanData: Record<string, unknown>, schoolId: string): Promise<string | undefined> {
    const admissionNumber = typeof cleanData.admissionNumber === 'string' ? cleanData.admissionNumber.trim() : '';
    if (!admissionNumber) return undefined;
    const existing = await studentRepository.findByAdmissionNumber(admissionNumber, schoolId);
    return existing ? existing._id.toString() : undefined;
  },

  // Re-uploading the same file (e.g. updating records mid-year) should update
  // existing students, not create duplicates — matched by admission number
  // when the source file provides one. `duplicateAction` (from the preview
  // step's Skip/Update/Import Anyway choice) overrides that default.
  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext, duplicateAction: DuplicateAction = 'update'): Promise<ProcessRowResult> {
    try {
      const admissionNumber = typeof cleanData.admissionNumber === 'string' ? cleanData.admissionNumber.trim() : '';
      const existing = admissionNumber && duplicateAction !== 'create'
        ? await studentRepository.findByAdmissionNumber(admissionNumber, ctx.schoolId)
        : null;

      if (existing && duplicateAction === 'skip') {
        return { success: true, recordId: existing._id.toString(), isUpdate: true, skipped: true };
      }

      if (existing) {
        const { admissionNumber: _ignored, ...updateData } = cleanData;
        const updated = await studentService.updateStudent(existing._id.toString(), updateData, ctx);
        return { success: true, recordId: updated._id.toString(), isUpdate: true };
      }

      const student = await studentService.createStudent(cleanData, ctx);
      return { success: true, recordId: student._id.toString() };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create student';
      logger.warn('Student import row failed', { error: message });
      return { success: false, error: message };
    }
  },

  async rollbackRow(recordId: string, ctx: AuthContext): Promise<void> {
    try {
      await studentService.deleteStudent(recordId, ctx);
    } catch (err) {
      // Log but don't propagate — partial rollback is still better than none
      logger.warn('Student rollback failed for record', { recordId, error: String(err) });
    }
  },
};
