import { AuthContext } from '../../../lib/auth-context';
import { teacherService } from '../../teachers/teacher.service';
import { teacherRepository } from '../../teachers/teacher.repository';
import { IProcessor, ProcessRowResult } from './processor.interface';
import { logger } from '../../../lib/logger';

export const teacherProcessor: IProcessor = {
  importType: 'teachers',

  // Re-uploading the same file (e.g. a corrected re-export) should update
  // existing teachers, not create duplicates — matched by email first, then
  // phone, since employeeId is server-generated and never comes from the file.
  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext): Promise<ProcessRowResult> {
    try {
      const email = typeof cleanData.email === 'string' ? cleanData.email.trim() : '';
      const phone = typeof cleanData.phone === 'string' ? cleanData.phone.trim() : '';
      const existing = (email || phone)
        ? await teacherRepository.findByEmailOrPhone(ctx.schoolId, email || undefined, phone || undefined)
        : null;

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
