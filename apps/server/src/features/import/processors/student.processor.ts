import { AuthContext } from '../../../lib/auth-context';
import { studentService } from '../../students/student.service';
import { studentRepository } from '../../students/student.repository';
import { IProcessor, ProcessRowResult, DuplicateAction } from './processor.interface';
import { logger } from '../../../lib/logger';

/** Admission-number match first (authoritative); falls back to exact
 *  name+class+section when the row has no admission number, or that number
 *  doesn't match anything, so a re-import of an originally name/class-only
 *  sheet still lands on the right existing student instead of duplicating. */
async function findExistingStudent(cleanData: Record<string, unknown>, schoolId: string) {
  const admissionNumber = typeof cleanData.admissionNumber === 'string' ? cleanData.admissionNumber.trim() : '';
  if (admissionNumber) {
    const byAdmission = await studentRepository.findByAdmissionNumber(admissionNumber, schoolId);
    if (byAdmission) return byAdmission;
  }

  const fullName = typeof cleanData.fullName === 'string' ? cleanData.fullName.trim() : '';
  const klass = typeof cleanData.class === 'string' ? cleanData.class.trim() : '';
  const section = typeof cleanData.section === 'string' ? cleanData.section.trim() : '';
  if (!fullName || !klass || !section) return null;
  return studentRepository.findByNameAndClass(fullName, klass, section, schoolId);
}

export const studentProcessor: IProcessor = {
  importType: 'students',

  // Matched by admission number when the file has one; otherwise falls back
  // to exact name+class+section — most re-imports of an original name/class-only
  // sheet won't carry the auto-generated admission number, and without this
  // fallback every row would silently be treated as a new student. See
  // findExistingStudent for the shared lookup used here and in processRow.
  async findDuplicate(cleanData: Record<string, unknown>, schoolId: string): Promise<string | undefined> {
    const existing = await findExistingStudent(cleanData, schoolId);
    return existing ? existing._id.toString() : undefined;
  },

  // Re-uploading the same file (e.g. updating records mid-year) should update
  // existing students, not create duplicates — matched by admission number,
  // falling back to name+class+section, when the source file allows it.
  // `duplicateAction` (from the preview step's Skip/Update/Import Anyway
  // choice) overrides that default.
  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext, duplicateAction: DuplicateAction = 'update'): Promise<ProcessRowResult> {
    try {
      const existing = duplicateAction !== 'create' ? await findExistingStudent(cleanData, ctx.schoolId) : null;

      if (existing && duplicateAction === 'skip') {
        return { success: true, recordId: existing._id.toString(), isUpdate: true, skipped: true };
      }

      if (existing) {
        // Never let a name/class-only import row overwrite the admission
        // number the student already has — that field is system-assigned.
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
