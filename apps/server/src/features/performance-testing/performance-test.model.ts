import mongoose, { Document, Schema } from 'mongoose';

// Persists the run record + final summary for a k6 test kicked off from the
// Ops Center Performance Testing screen. The *live* view during a run is
// served straight from performance-test.runner.ts's in-memory aggregator
// (never written to Mongo per-second — see the runner for why); this model
// only stores the run's config and, once it ends, the frozen final numbers
// so the History tab survives a server restart.

export type PerformanceTestStatus = 'running' | 'completed' | 'stopped' | 'failed';
export type PerformanceTestStage = 'ramp-up' | 'steady' | 'ramp-down' | 'completed';

export interface IPerformanceTestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSec: number;
  avgResponseMs: number;
  medianResponseMs: number;
  p90ResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
  maxResponseMs: number;
  successRatePercent: number;
  errorRatePercent: number;
  http429Count: number;
  http500Count: number;
  http401Count: number;
  authFailures: number;
  duplicateAttendanceRatePercent: number;
  raceConditionRatePercent: number;
  teacherWorkflowSuccessRatePercent: number;
  peakVUs: number;
}

export interface IPerformanceTestRun extends Document {
  runId: string;
  label: string;
  scriptName: string;
  targetVUs: number;
  durationMinutes: number;
  status: PerformanceTestStatus;
  stage: PerformanceTestStage;
  startedAt: Date;
  endedAt?: Date;
  startedByUserId: string;
  startedByName: string;
  summary?: IPerformanceTestSummary;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const summarySchema = new Schema<IPerformanceTestSummary>(
  {
    totalRequests: Number,
    successfulRequests: Number,
    failedRequests: Number,
    requestsPerSec: Number,
    avgResponseMs: Number,
    medianResponseMs: Number,
    p90ResponseMs: Number,
    p95ResponseMs: Number,
    p99ResponseMs: Number,
    maxResponseMs: Number,
    successRatePercent: Number,
    errorRatePercent: Number,
    http429Count: Number,
    http500Count: Number,
    http401Count: Number,
    authFailures: Number,
    duplicateAttendanceRatePercent: Number,
    raceConditionRatePercent: Number,
    teacherWorkflowSuccessRatePercent: Number,
    peakVUs: Number,
  },
  { _id: false },
);

const performanceTestRunSchema = new Schema<IPerformanceTestRun>(
  {
    runId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    scriptName: { type: String, required: true, default: 'teacher-workspace' },
    targetVUs: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    status: { type: String, enum: ['running', 'completed', 'stopped', 'failed'], default: 'running' },
    stage: { type: String, enum: ['ramp-up', 'steady', 'ramp-down', 'completed'], default: 'ramp-up' },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    startedByUserId: { type: String, required: true },
    startedByName: { type: String, required: true },
    summary: { type: summarySchema },
    failureReason: { type: String },
  },
  { timestamps: true, versionKey: false },
);

performanceTestRunSchema.index({ startedAt: -1 });

export const PerformanceTestRun = mongoose.model<IPerformanceTestRun>('PerformanceTestRun', performanceTestRunSchema);
