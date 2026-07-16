import mongoose, { Document, Schema } from 'mongoose';

// ── Sub-document interfaces ───────────────────────────────────────────────────

/** HH:mm 24-hour strings, compared as strings against IST time-of-day
 *  (matches the convention already used in staff-attendance.service.ts). */
export interface IAttendanceRules {
  startTime: string;
  lateAfter: string;
  halfDayAfter: string;
  schoolEndTime: string;
}

export interface IPayrollConfig {
  workingDaysPerMonth: number;
}

export interface ISchoolSettings extends Document {
  schoolId: string;
  schoolName: string;
  logoUrl?: string;
  attendanceRules: IAttendanceRules;
  payrollConfig: IPayrollConfig;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Defaults match the values that were previously hardcoded in
// staff-attendance.service.ts, so behavior doesn't change until an admin edits them.
export const DEFAULT_ATTENDANCE_RULES: IAttendanceRules = {
  startTime: '09:00',
  lateAfter: '09:10',
  halfDayAfter: '09:30',
  schoolEndTime: '17:00',
};

export const DEFAULT_PAYROLL_CONFIG: IPayrollConfig = {
  workingDaysPerMonth: 26,
};

const attendanceRulesSchema = new Schema<IAttendanceRules>(
  {
    startTime:     { type: String, required: true, default: DEFAULT_ATTENDANCE_RULES.startTime },
    lateAfter:     { type: String, required: true, default: DEFAULT_ATTENDANCE_RULES.lateAfter },
    halfDayAfter:  { type: String, required: true, default: DEFAULT_ATTENDANCE_RULES.halfDayAfter },
    schoolEndTime: { type: String, required: true, default: DEFAULT_ATTENDANCE_RULES.schoolEndTime },
  },
  { _id: false },
);

const payrollConfigSchema = new Schema<IPayrollConfig>(
  {
    workingDaysPerMonth: { type: Number, required: true, min: 1, max: 31, default: DEFAULT_PAYROLL_CONFIG.workingDaysPerMonth },
  },
  { _id: false },
);

const schoolSettingsSchema = new Schema<ISchoolSettings>(
  {
    schoolId:        { type: String, required: true, unique: true },
    schoolName:      { type: String, required: true, trim: true, default: 'FNIC' },
    logoUrl:         { type: String },
    attendanceRules: { type: attendanceRulesSchema, default: () => ({ ...DEFAULT_ATTENDANCE_RULES }) },
    payrollConfig:   { type: payrollConfigSchema, default: () => ({ ...DEFAULT_PAYROLL_CONFIG }) },
    updatedBy:       { type: String },
  },
  { timestamps: true, versionKey: false },
);

export const SchoolSettings = mongoose.model<ISchoolSettings>('SchoolSettings', schoolSettingsSchema);
