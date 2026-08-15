import mongoose, { Document, Schema } from 'mongoose';
import { SendRecipientInput } from './communication-core';

export type BulkSendJobItemStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED';

/**
 * One recipient within a BulkSendJob. Persisted (unlike the old
 * in-memory-only recipient array) so a bulk send survives a process restart —
 * see queue/bulk-processor.ts for the claim/resume logic that reads and
 * writes these.
 */
export interface IBulkSendJobItem extends Document {
  jobId: string;
  schoolId: string;
  recipient: SendRecipientInput;
  status: BulkSendJobItemStatus;
  claimedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bulkSendJobItemSchema = new Schema<IBulkSendJobItem>(
  {
    jobId: { type: String, required: true },
    schoolId: { type: String, required: true },
    recipient: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED'], default: 'PENDING' },
    claimedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// Every worker loop iteration does an atomic claim filtered on (jobId, status) —
// see bulk-send-job-item.repository.ts#claimNext.
bulkSendJobItemSchema.index({ jobId: 1, status: 1 });
// Startup reconciliation scans for items a dead instance left claimed.
bulkSendJobItemSchema.index({ status: 1, claimedAt: 1 });

export const BulkSendJobItem = mongoose.model<IBulkSendJobItem>('BulkSendJobItem', bulkSendJobItemSchema);
