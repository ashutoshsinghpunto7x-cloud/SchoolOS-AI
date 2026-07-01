import { AuthContext } from '../../../lib/auth-context';
import { studentService } from '../../students/student.service';
import { IProcessor, ProcessRowResult } from './processor.interface';
import { logger } from '../../../lib/logger';

export const studentProcessor: IProcessor = {
  importType: 'students',

  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext): Promise<ProcessRowResult> {
    try {
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
