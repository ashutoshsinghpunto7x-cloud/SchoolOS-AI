import mongoose, { Document, Schema } from 'mongoose';

// Per-minute rollup of the in-process metrics buckets (middlewares/metrics.ts)
// so historical traffic/error/latency trend charts survive a process
// restart — the buckets themselves stay in-memory/rolling-60s only. One
// document per minute per instance, not per-request, to stay cheap on a
// free-tier Atlas cluster.

export interface IMetricsSnapshot extends Document {
  minuteStart: Date;
  requests: number;
  errorCount: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  instance: string;
  createdAt: Date;
}

const metricsSnapshotSchema = new Schema<IMetricsSnapshot>(
  {
    minuteStart: { type: Date, required: true, index: true },
    requests: { type: Number, required: true },
    errorCount: { type: Number, required: true },
    avgResponseTimeMs: { type: Number, required: true },
    p95ResponseTimeMs: { type: Number, required: true },
    p99ResponseTimeMs: { type: Number, required: true },
    instance: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

metricsSnapshotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const MetricsSnapshotModel = mongoose.model<IMetricsSnapshot>('OpsMetricsSnapshot', metricsSnapshotSchema);
