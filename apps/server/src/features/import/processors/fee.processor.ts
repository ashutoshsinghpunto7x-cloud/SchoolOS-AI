import { AuthContext } from '../../../lib/auth-context';
import { feeService } from '../../fees/fee.service';
import { IProcessor, ProcessRowResult } from './processor.interface';
import { logger } from '../../../lib/logger';

export const feeProcessor: IProcessor = {
  importType: 'fees',

  async processRow(cleanData: Record<string, unknown>, ctx: AuthContext): Promise<ProcessRowResult> {
    try {
      const record = await feeService.createFeeRecord(cleanData, ctx);
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
