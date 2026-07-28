import mongoose, { Document, Schema } from 'mongoose';

// Individual slow-request records — only requests over SLOW_REQUEST_MS get
// written here (see middlewares/metrics.ts), so volume stays bounded even
// under heavy traffic. Note: this measures total request time only; there is
// no per-query database-time breakdown yet (would need a global Mongoose
// query-timing plugin registered before any model is imported, which is a
// larger, riskier change deferred to a later pass).

export interface ISlowRequest extends Document {
  requestId?: string;
  correlationId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
  role?: string;
  schoolId?: string;
  memoryMb?: number;
  createdAt: Date;
}

const slowRequestSchema = new Schema<ISlowRequest>(
  {
    requestId: { type: String },
    correlationId: { type: String },
    method: { type: String, required: true },
    path: { type: String, required: true, index: true },
    statusCode: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    userId: { type: String },
    role: { type: String },
    schoolId: { type: String },
    memoryMb: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

slowRequestSchema.index({ createdAt: -1 });
slowRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const SlowRequestModel = mongoose.model<ISlowRequest>('OpsSlowRequest', slowRequestSchema);
