import mongoose, { Document, Schema } from 'mongoose';
import { NotificationChannel, NotificationType } from './notification-types';

// ── Status ────────────────────────────────────────────────────────────────────
//
// QUEUED    — accepted, not yet handed to a provider (e.g. waiting in a bulk batch)
// SENT      — handed to the provider and accepted by it
// DELIVERED — provider confirmed delivery to the recipient's device (webhook)
// READ      — recipient opened/read it (WhatsApp read-receipts, webhook)
// FAILED    — provider rejected it or delivery failed permanently
// SKIPPED   — never attempted (no phone number, channel disabled, etc.)
export type NotificationStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED';

export interface INotificationLog extends Document {
  schoolId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  // Recipient
  recipientName?: string;
  studentId?: string;
  parentName?: string;
  phoneNumber?: string;
  // Delivery
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metaMessageId?: string;
  errorMessage?: string;
  retryCount: number;
  // What was actually sent (rendered body + template placeholders used) — kept
  // for audit/debugging without needing to re-render from the template later.
  payload: Record<string, unknown>;
  // Groups recipients of the same bulk operation (attendance run, fee reminder
  // batch, broadcast) so dashboard/history can report on the batch as a whole.
  bulkJobId?: string;
  // Ties this notification to the business record that triggered it (e.g. a
  // FeePayment._id for FEE_PAYMENT_RECEIPT) — combined with notificationType,
  // this is the idempotency key that stops a transaction being notified twice
  // (refresh, retry, duplicate request). Unique per (schoolId, notificationType,
  // sourceId) via the sparse index below; not every notification type sets it.
  sourceId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const NOTIFICATION_STATUSES: NotificationStatus[] = ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED'];

const notificationLogSchema = new Schema<INotificationLog>(
  {
    schoolId: { type: String, required: true },
    notificationType: { type: String, required: true },
    channel: { type: String, required: true },
    recipientName: { type: String, trim: true },
    studentId: { type: String },
    parentName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: 'QUEUED' },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    metaMessageId: { type: String },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0, min: 0 },
    payload: { type: Schema.Types.Mixed, default: {} },
    bulkJobId: { type: String },
    sourceId: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

notificationLogSchema.index({ schoolId: 1, createdAt: -1 });
notificationLogSchema.index({ schoolId: 1, notificationType: 1, createdAt: -1 });
notificationLogSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });
notificationLogSchema.index({ bulkJobId: 1 });
notificationLogSchema.index({ metaMessageId: 1 }); // webhook status-update lookups
// Idempotency guard — at most one log per (schoolId, notificationType, sourceId).
// Sparse: types that don't set sourceId (bulk broadcasts etc.) are unaffected.
notificationLogSchema.index({ schoolId: 1, notificationType: 1, sourceId: 1 }, { unique: true, sparse: true });

export const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', notificationLogSchema);
