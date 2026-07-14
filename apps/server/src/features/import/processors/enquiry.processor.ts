import { AuthContext } from '../../../lib/auth-context';
import { enquiryService } from '../../enquiries/enquiry.service';
import { enquiryRepository } from '../../enquiries/enquiry.repository';
import { IProcessor, ProcessRowResult, DuplicateAction } from './processor.interface';
import { logger } from '../../../lib/logger';

function matchKey(cleanData: Record<string, unknown>): { studentName: string; parentPhone: string } | undefined {
  const studentName = typeof cleanData.studentName === 'string' ? cleanData.studentName.trim() : '';
  const parentPhone = typeof cleanData.parentPhone === 'string' ? cleanData.parentPhone.trim() : '';
  if (!studentName || !parentPhone) return undefined;
  return { studentName, parentPhone };
}

export const enquiryProcessor: IProcessor = {
  importType: 'admissions',

  async findDuplicate(cleanData: Record<string, unknown>, schoolId: string): Promise<string | undefined> {
    const key = matchKey(cleanData);
    if (!key) return undefined;
    const existing = await enquiryRepository.findByStudentAndParentPhone(schoolId, key.studentName, key.parentPhone);
    return existing ? existing._id.toString() : undefined;
  },

  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext, duplicateAction: DuplicateAction = 'update'): Promise<ProcessRowResult> {
    try {
      const key = matchKey(cleanData);
      const existing = key && duplicateAction !== 'create'
        ? await enquiryRepository.findByStudentAndParentPhone(ctx.schoolId, key.studentName, key.parentPhone)
        : null;

      if (existing && duplicateAction === 'skip') {
        return { success: true, recordId: existing._id.toString(), isUpdate: true, skipped: true };
      }

      if (existing) {
        const updated = await enquiryService.updateEnquiry(existing._id.toString(), cleanData, ctx);
        return { success: true, recordId: updated._id.toString(), isUpdate: true };
      }

      const enquiry = await enquiryService.createEnquiry(cleanData, ctx);
      return { success: true, recordId: enquiry._id.toString() };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create enquiry';
      logger.warn('Admissions import row failed', { error: message });
      return { success: false, error: message };
    }
  },

  async rollbackRow(recordId: string, ctx: AuthContext): Promise<void> {
    try {
      await enquiryService.deleteEnquiry(recordId, ctx);
    } catch (err) {
      logger.warn('Admissions rollback failed for record', { recordId, error: String(err) });
    }
  },
};
