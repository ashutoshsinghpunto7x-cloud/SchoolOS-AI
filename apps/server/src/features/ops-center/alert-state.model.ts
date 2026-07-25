import mongoose, { Document, Schema } from 'mongoose';

// Persists the human workflow (acknowledge/assign/resolve) for alerts that
// are otherwise computed live from real signals (error rate, security events,
// DB health, attendance) each time the Alerts screen is loaded — see
// ops.service.ts `evaluateAlerts`. `alertKey` is a stable id for the
// *condition* (e.g. "db.disconnected", "attendance.low.school_001"), not a
// one-off event, so re-triggering the same condition finds its existing state.

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface IAlertState extends Document {
  alertKey: string;
  status: AlertStatus;
  assignedToUserId?: string;
  assignedToName?: string;
  note?: string;
  updatedByUserId: string;
  updatedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const alertStateSchema = new Schema<IAlertState>(
  {
    alertKey: { type: String, required: true, unique: true },
    status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
    assignedToUserId: { type: String },
    assignedToName: { type: String },
    note: { type: String, trim: true, maxlength: 1000 },
    updatedByUserId: { type: String, required: true },
    updatedByName: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const AlertState = mongoose.model<IAlertState>('OpsAlertState', alertStateSchema);
