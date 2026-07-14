import { AuthContext } from '../../../lib/auth-context';
import { feeService } from '../../fees/fee.service';
import { feeRepository } from '../../fees/fee.repository';
import { studentRepository } from '../../students/student.repository';
import { FeeHead } from '../../fees/fee.model';
import { IProcessor, ProcessRowResult, DuplicateAction } from './processor.interface';
import { logger } from '../../../lib/logger';

/** Resolves the row's studentId — either supplied directly or looked up from
 *  an Admission Number, which is what real school fee sheets actually carry. */
async function resolveStudentId(cleanData: Record<string, unknown>, schoolId: string): Promise<{ studentId: string } | { error: string }> {
  const directId = typeof cleanData.studentId === 'string' ? cleanData.studentId.trim() : '';
  if (directId) return { studentId: directId };

  const admissionNumber = typeof cleanData.admissionNumber === 'string' ? cleanData.admissionNumber.trim() : '';
  if (!admissionNumber) return { error: 'Row has neither a Student ID nor an Admission Number' };

  const student = await studentRepository.findByAdmissionNumber(admissionNumber, schoolId);
  if (!student) return { error: `No student found with Admission Number "${admissionNumber}"` };
  return { studentId: student._id.toString() };
}

export const feeProcessor: IProcessor = {
  importType: 'fees',

  async findDuplicate(cleanData: Record<string, unknown>, schoolId: string): Promise<string | undefined> {
    const resolved = await resolveStudentId(cleanData, schoolId);
    if ('error' in resolved) return undefined;
    const feeHead = cleanData.feeHead as FeeHead;
    const academicYear = typeof cleanData.academicYear === 'string' ? cleanData.academicYear : '';
    const month = typeof cleanData.month === 'string' && cleanData.month ? cleanData.month : undefined;
    if (!feeHead || !academicYear) return undefined;
    const existing = await feeRepository.findDuplicate(schoolId, resolved.studentId, feeHead, academicYear, month);
    return existing ? existing._id.toString() : undefined;
  },

  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext, duplicateAction: DuplicateAction = 'update'): Promise<ProcessRowResult> {
    try {
      const resolved = await resolveStudentId(cleanData, ctx.schoolId);
      if ('error' in resolved) return { success: false, error: resolved.error };

      const { admissionNumber: _ignored, ...rest } = cleanData;
      const payload: Record<string, unknown> = { ...rest, studentId: resolved.studentId };

      const feeHead = payload.feeHead as FeeHead;
      const academicYear = typeof payload.academicYear === 'string' ? payload.academicYear : '';
      const month = typeof payload.month === 'string' && payload.month ? payload.month : undefined;

      const existing = feeHead && academicYear && duplicateAction !== 'create'
        ? await feeRepository.findDuplicate(ctx.schoolId, resolved.studentId, feeHead, academicYear, month)
        : null;

      if (existing && duplicateAction === 'skip') {
        return { success: true, recordId: existing._id.toString(), isUpdate: true, skipped: true };
      }

      if (existing) {
        const updated = await feeService.updateFeeRecord(existing._id.toString(), payload, ctx);
        return { success: true, recordId: updated._id.toString(), isUpdate: true };
      }

      const record = await feeService.createFeeRecord(payload, ctx);
      return { success: true, recordId: record._id.toString() };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create fee record';
      logger.warn('Fee import row failed', { error: message });
      return { success: false, error: message };
    }
  },

  async rollbackRow(recordId: string, ctx: AuthContext): Promise<void> {
    try {
      await feeService.deleteFeeRecord(recordId, ctx);
    } catch (err) {
      logger.warn('Fee rollback failed for record', { recordId, error: String(err) });
    }
  },
};
