import mongoose, { Document, Schema } from 'mongoose';

// Singleton document — one row holds the whole platform's maintenance state.
// Enforced via a fixed `key` unique index rather than a separate "settings"
// collection pattern, matching how small global-config docs are usually done
// in this codebase (findOneAndUpdate with upsert on a constant filter).
export const MAINTENANCE_SINGLETON_KEY = 'singleton';

export interface IMaintenanceState extends Document {
  key: string;
  /** Manual kill switch — independent of the schedule window, wins immediately either way. */
  manualActive: boolean;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  message: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceStateSchema = new Schema<IMaintenanceState>(
  {
    key: { type: String, required: true, unique: true, default: MAINTENANCE_SINGLETON_KEY },
    manualActive: { type: Boolean, default: false },
    scheduledStartAt: { type: Date },
    scheduledEndAt: { type: Date },
    message: { type: String, trim: true, default: 'SchoolOS is undergoing scheduled maintenance. Please check back shortly.' },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

export const MaintenanceState = mongoose.model<IMaintenanceState>('MaintenanceState', maintenanceStateSchema);
