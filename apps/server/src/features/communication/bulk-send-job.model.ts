import mongoose, { Document, Schema } from 'mongoose';
import { NotificationChannel, NotificationType } from './notification-types';

export type BulkSendJobStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Progress tracker for an asynchronous bulk send (attendance run, fee reminder
 * batch, broadcast). The HTTP request that starts a bulk send returns this
 * document's id immediately; queue/bulk-processor.ts fills in the counters as
 * it works through the recipient list in the background.
 */
export interface IBulkSendJob extends Document {
  schoolId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  status: BulkSendJobStatus;
  totalRecipients: number;
  sent: number;
  failed: number;
  skipped: number;
  createdBy: string;
  /** Kept alongside createdBy (display name) so a resumed run (see
   *  queue/bulk-processor.ts#resumeStuckBulkJobs) can still write the audit
   *  log entry with the right actor after a restart. */
  createdByUserId: string;
  overrideBody?: string;
  ip?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bulkSendJobSchema = new Schema<IBulkSendJob>(
  {
    schoolId: { type: String, required: true },
    notificationType: { type: String, required: true },
    channel: { type: String, required: true },
    status: { type: String, enum: ['PROCESSING', 'COMPLETED', 'FAILED'], default: 'PROCESSING' },
    totalRecipients: { type: Number, required: true, min: 0 },
    sent: { type: Number, default: 0, min: 0 },
    failed: { type: Number, default: 0, min: 0 },
    skipped: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, required: true },
    createdByUserId: { type: String, required: true },
    overrideBody: { type: String },
    ip: { type: String },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// Startup reconciliation scans PROCESSING jobs whose updatedAt (bumped by
// every counter increment) has gone stale — see
// queue/bulk-processor.ts#resumeStuckBulkJobs.
bulkSendJobSchema.index({ status: 1, updatedAt: 1 });

bulkSendJobSchema.index({ schoolId: 1, createdAt: -1 });
bulkSendJobSchema.index({ schoolId: 1, status: 1 });

export const BulkSendJob = mongoose.model<IBulkSendJob>('BulkSendJob', bulkSendJobSchema);
