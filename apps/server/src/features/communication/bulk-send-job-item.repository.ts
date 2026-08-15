import { BulkSendJobItem, IBulkSendJobItem } from './bulk-send-job-item.model';
import { SendRecipientInput } from './communication-core';

export const bulkSendJobItemRepository = {
  async insertMany(jobId: string, schoolId: string, recipients: SendRecipientInput[]): Promise<void> {
    if (recipients.length === 0) return;
    await BulkSendJobItem.insertMany(
      recipients.map((recipient) => ({ jobId, schoolId, recipient, status: 'PENDING' as const })),
      { ordered: false },
    );
  },

  /**
   * Atomically claims one PENDING item for this job and marks it PROCESSING.
   * The (jobId, status) filter + atomic findOneAndUpdate means this is safe
   * to call concurrently from multiple workers in one process *and* from
   * workers in different processes (e.g. the original run and a resumed run
   * racing after a restart) — exactly one caller ever gets a given item.
   */
  async claimNext(jobId: string): Promise<IBulkSendJobItem | null> {
    return BulkSendJobItem.findOneAndUpdate(
      { jobId, status: 'PENDING' },
      { $set: { status: 'PROCESSING', claimedAt: new Date() } },
      { new: true, sort: { _id: 1 } },
    );
  },

  async markResult(itemId: string, status: 'SENT' | 'FAILED' | 'SKIPPED', error?: string): Promise<void> {
    await BulkSendJobItem.updateOne({ _id: itemId }, { $set: { status, error } });
  },

  /**
   * Resets items a dead process left claimed (status PROCESSING, claimed
   * before `staleBefore`) back to PENDING so a resumed run retries them.
   * Called once per stuck job right before it's resumed — see
   * queue/bulk-processor.ts#resumeStuckBulkJobs.
   */
  async reclaimStale(jobId: string, staleBefore: Date): Promise<number> {
    const result = await BulkSendJobItem.updateMany(
      { jobId, status: 'PROCESSING', claimedAt: { $lt: staleBefore } },
      { $set: { status: 'PENDING' }, $unset: { claimedAt: 1 } },
    );
    return result.modifiedCount;
  },

  async hasIncomplete(jobId: string): Promise<boolean> {
    const count = await BulkSendJobItem.countDocuments({ jobId, status: { $in: ['PENDING', 'PROCESSING'] } });
    return count > 0;
  },
};
