import { AuthContext } from '../../../lib/auth-context';
import { teacherService } from '../../teachers/teacher.service';
import { IProcessor, ProcessRowResult } from './processor.interface';
import { logger } from '../../../lib/logger';

export const teacherProcessor: IProcessor = {
  importType: 'teachers',

  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext): Promise<ProcessRowResult> {
    try {
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
