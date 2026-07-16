import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type StaffAttendanceStatus = 'present' | 'late' | 'half_day' | 'absent';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IStaffAttendancePunch {
  time: Date;
  recordedBy: string;
  device?: string;
}

// ── Document Interface ────────────────────────────────────────────────────────

export interface IStaffAttendanceRecord extends Document {
  employeeId: string;         // human-readable EMP-xxxx id
  employeeObjectId: string;   // Mongo ref to Employee
  schoolId: string;
  date: string;                // YYYY-MM-DD — matches student attendance.model.ts convention
  checkIn?: IStaffAttendancePunch;
  checkOut?: IStaffAttendancePunch;
  workingMinutes?: number;
  status: StaffAttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const staffAttendancePunchSchema = new Schema<IStaffAttendancePunch>(
  {
    time: { type: Date, required: true },
    recordedBy: { type: String, required: true },
    device: { type: String, trim: true },
  },
  { _id: false }
);

const STAFF_ATTENDANCE_STATUSES: StaffAttendanceStatus[] = ['present', 'late', 'half_day', 'absent'];

const staffAttendanceSchema = new Schema<IStaffAttendanceRecord>(
  {
    employeeId:       { type: String, required: true },
    employeeObjectId: { type: String, required: true },
    schoolId:         { type: String, required: true, default: 'DEMO_SCHOOL' },
    date:             { type: String, required: true }, // ISO date YYYY-MM-DD
    checkIn:          { type: staffAttendancePunchSchema },
    checkOut:         { type: staffAttendancePunchSchema },
    workingMinutes:   { type: Number, min: 0 },
    status:           { type: String, enum: STAFF_ATTENDANCE_STATUSES, required: true, default: 'present' },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// One record per employee per date (find-or-create key)
staffAttendanceSchema.index({ schoolId: 1, employeeId: 1, date: 1 }, { unique: true });
// Today's roster / date range queries
staffAttendanceSchema.index({ schoolId: 1, date: 1 });
// Per-employee history
staffAttendanceSchema.index({ schoolId: 1, employeeId: 1, date: -1 });

export const StaffAttendanceRecord = mongoose.model<IStaffAttendanceRecord>(
  'StaffAttendanceRecord',
  staffAttendanceSchema
);
