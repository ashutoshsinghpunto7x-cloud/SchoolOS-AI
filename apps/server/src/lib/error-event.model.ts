import mongoose, { Document, Schema } from 'mongoose';
import type { RootCauseCategory } from './root-cause-classifier';

// Durable counterpart to error-events.ts's in-memory ring buffer. The ring
// buffer stays as the fast path for the live-tailing Ops Center views; this
// collection is what survives a process restart and backs historical
// per-endpoint breakdowns, root-cause search, and "last seen" on the
// redesigned Error Dashboard.

export interface IErrorEvent extends Document {
  requestId?: string;
  correlationId?: string;
  module: string;
  api?: string;
  method?: string;
  statusCode: number;
  code: string;
  message: string;
  exception?: string;
  stack?: string;
  fileName?: string;
  lineNumber?: number;
  functionName?: string;
  userId?: string;
  role?: string;
  schoolId?: string;
  requestBody?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  executionTimeMs?: number;
  memoryMb?: number;
  category: RootCauseCategory;
  confidencePercent: number;
  probableCause: string;
  recommendedFix: string;
  createdAt: Date;
}

const errorEventSchema = new Schema<IErrorEvent>(
  {
    requestId: { type: String },
    correlationId: { type: String },
    module: { type: String, required: true, index: true },
    api: { type: String },
    method: { type: String },
    statusCode: { type: Number, required: true },
    code: { type: String, required: true },
    message: { type: String, required: true },
    exception: { type: String },
    stack: { type: String },
    fileName: { type: String },
    lineNumber: { type: Number },
    functionName: { type: String },
    userId: { type: String },
    role: { type: String },
    schoolId: { type: String, index: true },
    requestBody: { type: Schema.Types.Mixed },
    headers: { type: Schema.Types.Mixed },
    executionTimeMs: { type: Number },
    memoryMb: { type: Number },
    category: { type: String, required: true, index: true },
    confidencePercent: { type: Number, required: true },
    probableCause: { type: String, required: true },
    recommendedFix: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

errorEventSchema.index({ module: 1, createdAt: -1 });
errorEventSchema.index({ statusCode: 1, createdAt: -1 });
errorEventSchema.index({ requestId: 1 });
// Error volume is much higher than AuditLog and has no compliance retention
// need — 90 days is enough for trend/root-cause analysis without unbounded
// growth on a free-tier Atlas cluster.
errorEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ErrorEventModel = mongoose.model<IErrorEvent>('OpsErrorEvent', errorEventSchema);
