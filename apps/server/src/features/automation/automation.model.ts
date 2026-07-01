import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type AutomationJobType =
  | 'VOICE_CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'SMS'
  | 'FEE_REMINDER'
  | 'PTM_REMINDER'
  | 'GENERAL_BROADCAST'
  | 'CUSTOM';

export type AutomationJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETRYING';

export type AutomationProviderName = 'n8n' | 'bullmq' | 'temporal' | 'worker' | 'mock';

/** The domain entity that this job is linked to, enabling the webhook to update it. */
export type ReferenceType = 'communication' | 'student' | 'campaign' | 'custom';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IAutomationJob extends Document {
  type: AutomationJobType;
  provider: AutomationProviderName;
  status: AutomationJobStatus;
  payload: Record<string, unknown>;
  /** Workflow library ID (e.g. 'WF-001') — present when dispatched via a workflow. */
  workflowId?: string;
  /** ID of the linked domain entity (e.g. Communication._id). */
  referenceId?: string;
  referenceType?: ReferenceType;
  triggeredBy: string;
  schoolId: string;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  /** Result data written back by the automation provider via webhook. */
  result?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const automationJobSchema = new Schema<IAutomationJob>(
  {
    type: {
      type: String,
      enum: ['VOICE_CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'FEE_REMINDER', 'PTM_REMINDER', 'GENERAL_BROADCAST', 'CUSTOM'],
      required: true,
    },
    provider: {
      type: String,
      enum: ['n8n', 'bullmq', 'temporal', 'worker', 'mock'],
      required: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING'],
      default: 'QUEUED',
    },
    payload: { type: Schema.Types.Mixed, required: true },
    workflowId: { type: String },
    referenceId: { type: String },
    referenceType: {
      type: String,
      enum: ['communication', 'student', 'campaign', 'custom'],
    },
    triggeredBy: { type: String, required: true },
    schoolId: { type: String, required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
    result: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

automationJobSchema.index({ schoolId: 1, createdAt: -1 });
automationJobSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
automationJobSchema.index({ schoolId: 1, type: 1, createdAt: -1 });
automationJobSchema.index({ schoolId: 1, workflowId: 1, createdAt: -1 });
automationJobSchema.index({ referenceId: 1 });

export const AutomationJob = mongoose.model<IAutomationJob>('AutomationJob', automationJobSchema);
