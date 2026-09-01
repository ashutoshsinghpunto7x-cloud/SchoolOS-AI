import mongoose, { Document, Schema } from 'mongoose';

// Materialized risk alerts — the nightly detection job (plan-alert.job.ts)
// writes these so dashboards read one small precomputed table instead of
// recomputing risk on every page load, per "The Planning Engine" design doc
// §4/§7. One open (unresolved) alert per {planId, type} at a time: a
// detection run either refreshes an already-open alert in place or opens a
// new one, and auto-resolves any alert whose condition no longer holds.

export type PlanAlertType = 'behind_schedule' | 'revision_at_risk' | 'no_plan';
export type PlanAlertSeverity = 'info' | 'warning' | 'critical';

export interface IPlanAlert extends Document {
  schoolId: string;
  planId?: string;         // absent for a 'no_plan' alert — there's no plan to reference
  teacherId: string;
  teacherName: string;
  class?: string;
  section?: string;
  subject?: string;
  type: PlanAlertType;
  severity: PlanAlertSeverity;
  message: string;
  daysBehind?: number;
  detectedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PLAN_ALERT_TYPES: PlanAlertType[] = ['behind_schedule', 'revision_at_risk', 'no_plan'];
const PLAN_ALERT_SEVERITIES: PlanAlertSeverity[] = ['info', 'warning', 'critical'];

const planAlertSchema = new Schema<IPlanAlert>(
  {
    schoolId:    { type: String, required: true, default: 'DEMO_SCHOOL' },
    planId:      { type: String },
    teacherId:   { type: String, required: true },
    teacherName: { type: String, required: true, trim: true },
    class:       { type: String, trim: true },
    section:     { type: String, trim: true },
    subject:     { type: String, trim: true },
    type:        { type: String, enum: PLAN_ALERT_TYPES, required: true },
    severity:    { type: String, enum: PLAN_ALERT_SEVERITIES, required: true },
    message:     { type: String, required: true, trim: true },
    daysBehind:  { type: Number },
    detectedAt:  { type: Date, required: true },
    resolvedAt:  { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// One open alert per plan+type — planId is undefined for 'no_plan' alerts, so
// that case keys on teacherId instead (sparse-friendly since Mongo treats
// missing fields as equal for uniqueness only when the index is sparse/partial;
// here we simply query instead of relying on a unique index for that case).
planAlertSchema.index({ schoolId: 1, resolvedAt: 1, severity: 1, detectedAt: -1 });
planAlertSchema.index({ schoolId: 1, planId: 1, type: 1 });
planAlertSchema.index({ schoolId: 1, teacherId: 1, type: 1 });

export const PlanAlert = mongoose.model<IPlanAlert>('PlanAlert', planAlertSchema);
