import { AuthContext } from '../../../lib/auth-context';
import { enquiryService } from '../../enquiries/enquiry.service';
import { IProcessor, ProcessRowResult } from './processor.interface';
import { logger } from '../../../lib/logger';

export const enquiryProcessor: IProcessor = {
  importType: 'admissions',

  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext): Promise<ProcessRowResult> {
    try {
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
