import { AuthContext } from '../../../lib/auth-context';
import { teacherService } from '../../teachers/teacher.service';
import { teacherRepository } from '../../teachers/teacher.repository';
import { IProcessor, ProcessRowResult, DuplicateAction } from './processor.interface';
import { logger } from '../../../lib/logger';

export const teacherProcessor: IProcessor = {
  importType: 'teachers',

  async findDuplicate(cleanData: Record<string, unknown>, schoolId: string): Promise<string | undefined> {
    const email = typeof cleanData.email === 'string' ? cleanData.email.trim() : '';
    const phone = typeof cleanData.phone === 'string' ? cleanData.phone.trim() : '';
    if (!email && !phone) return undefined;
    const existing = await teacherRepository.findByEmailOrPhone(schoolId, email || undefined, phone || undefined);
    return existing ? existing._id.toString() : undefined;
  },

  // Re-uploading the same file (e.g. a corrected re-export) should update
  // existing teachers, not create duplicates — matched by email first, then
  // phone, since employeeId is server-generated and never comes from the file.
  // `duplicateAction` (from the preview step's Skip/Update/Import Anyway
  // choice) overrides that default.
  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext, duplicateAction: DuplicateAction = 'update'): Promise<ProcessRowResult> {
    try {
      const email = typeof cleanData.email === 'string' ? cleanData.email.trim() : '';
      const phone = typeof cleanData.phone === 'string' ? cleanData.phone.trim() : '';
      const existing = (email || phone) && duplicateAction !== 'create'
        ? await teacherRepository.findByEmailOrPhone(ctx.schoolId, email || undefined, phone || undefined)
        : null;

      if (existing && duplicateAction === 'skip') {
        return { success: true, recordId: existing._id.toString(), isUpdate: true, skipped: true };
      }

      if (existing) {
        const updated = await teacherService.updateTeacher(existing._id.toString(), cleanData, ctx);
        return { success: true, recordId: updated._id.toString(), isUpdate: true };
      }

      const teacher = await teacherService.createTeacher(cleanData, ctx);
      return { success: true, recordId: teacher._id.toString() };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create teacher';
      logger.warn('Teacher import row failed', { error: message });
      return { success: false, error: message };
    }
  },

  async rollbackRow(recordId: string, ctx: AuthContext): Promise<void> {
    try {
      await teacherService.deleteTeacher(recordId, ctx);
    } catch (err) {
      logger.warn('Teacher rollback failed for record', { recordId, error: String(err) });
    }
  },
};
