import mongoose, { Document, Schema } from 'mongoose';

// ── Types & Status ────────────────────────────────────────────────────────────

/** Core types supported now; email/sms/broadcast reserved for future builds. */
export type CommunicationType = 'call' | 'whatsapp' | 'note' | 'email' | 'sms' | 'broadcast';

/**
 * QUEUED    — Received; awaiting dispatch to provider.
 * PENDING   — Dispatched to provider; waiting for it to begin.
 * RUNNING   — Provider is actively processing (e.g. call in progress).
 * PROCESSING — Webhook received; backend is writing results.
 * COMPLETED — Finished successfully.
 * DELIVERED — Delivered to recipient (WhatsApp/SMS).
 * READ      — Recipient has read the message (WhatsApp read-receipts).
 * FAILED    — Permanent failure.
 * CANCELLED — Cancelled before completion.
 */
export type CommStatus =
  | 'QUEUED'
  | 'PENDING'
  | 'RUNNING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED';

/** Which provider handled or will handle this communication. */
export type CommProvider = 'mock' | 'vapi' | 'twilio' | 'whatsapp-cloud' | 'email-smtp' | 'sms-gateway';

/** Whether we initiated the communication or received it. */
export type CommDirection = 'outbound' | 'inbound';

// ── Document Interface ────────────────────────────────────────────────────────

export interface ICommunication extends Document {
  studentId: mongoose.Types.ObjectId;
  parentId?: string;
  campaignId?: string;
  type: CommunicationType;
  status: CommStatus;
  provider: CommProvider;
  direction: CommDirection;
  title: string;
  message?: string;
  summary: string;
  recommendation?: string;
  nextFollowUp?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const communicationSchema = new Schema<ICommunication>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    parentId: { type: String },
    campaignId: { type: String },
    type: {
      type: String,
      enum: ['call', 'whatsapp', 'note', 'email', 'sms', 'broadcast'],
      required: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'PENDING', 'RUNNING', 'PROCESSING', 'COMPLETED', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED'],
      default: 'COMPLETED',
    },
    provider: {
      type: String,
      enum: ['mock', 'vapi', 'twilio', 'whatsapp-cloud', 'email-smtp', 'sms-gateway'],
      required: true,
      default: 'mock',
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      default: 'outbound',
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    summary: { type: String, default: '', trim: true },
    recommendation: { type: String, trim: true },
    nextFollowUp: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String, required: true },
    schoolId: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

communicationSchema.index({ studentId: 1, createdAt: -1 });
communicationSchema.index({ schoolId: 1, createdAt: -1 });
communicationSchema.index({ schoolId: 1, type: 1, createdAt: -1 });
communicationSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
communicationSchema.index({ status: 1 }); // for webhook lookups

export const Communication = mongoose.model<ICommunication>('Communication', communicationSchema);
