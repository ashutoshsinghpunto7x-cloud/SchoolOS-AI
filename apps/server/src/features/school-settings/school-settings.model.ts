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

/** Daily window (HH:mm, IST) during which teachers may submit behaviour
 *  marks — same string-comparison convention as IAttendanceRules. */
export interface IBehaviorWindow {
  startTime: string;
  endTime: string;
}

/** Report-card / official-document branding — kept separate from the
 *  operational config above since it's edited far less often and only ever
 *  read (never used in scheduling/business logic). */
export interface IReportCardBranding {
  motto?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  principalName?: string;
  principalSignatureUrl?: string;
  schoolSealUrl?: string;
}

export interface ISchoolSettings extends Document {
  schoolId: string;
  schoolName: string;
  logoUrl?: string;
  attendanceRules: IAttendanceRules;
  payrollConfig: IPayrollConfig;
  behaviorWindow: IBehaviorWindow;
  reportCardBranding: IReportCardBranding;
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

// School day, matching DEFAULT_ATTENDANCE_RULES.startTime/schoolEndTime, so
// behaviour marking is open whenever school is in session until an admin
// narrows it.
export const DEFAULT_BEHAVIOR_WINDOW: IBehaviorWindow = {
  startTime: '09:00',
  endTime: '15:00',
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

const behaviorWindowSchema = new Schema<IBehaviorWindow>(
  {
    startTime: { type: String, required: true, default: DEFAULT_BEHAVIOR_WINDOW.startTime },
    endTime:   { type: String, required: true, default: DEFAULT_BEHAVIOR_WINDOW.endTime },
  },
  { _id: false },
);

const reportCardBrandingSchema = new Schema<IReportCardBranding>(
  {
    motto:                  { type: String, trim: true },
    address:                { type: String, trim: true },
    phone:                  { type: String, trim: true },
    website:                { type: String, trim: true },
    email:                  { type: String, trim: true, lowercase: true },
    principalName:          { type: String, trim: true },
    principalSignatureUrl:  { type: String },
    schoolSealUrl:          { type: String },
  },
  { _id: false },
);

const schoolSettingsSchema = new Schema<ISchoolSettings>(
  {
    schoolId:          { type: String, required: true, unique: true },
    schoolName:        { type: String, required: true, trim: true, default: 'FNIC' },
    logoUrl:           { type: String },
    attendanceRules:   { type: attendanceRulesSchema, default: () => ({ ...DEFAULT_ATTENDANCE_RULES }) },
    payrollConfig:     { type: payrollConfigSchema, default: () => ({ ...DEFAULT_PAYROLL_CONFIG }) },
    behaviorWindow:    { type: behaviorWindowSchema, default: () => ({ ...DEFAULT_BEHAVIOR_WINDOW }) },
    reportCardBranding:{ type: reportCardBrandingSchema, default: () => ({}) },
    updatedBy:         { type: String },
  },
  { timestamps: true, versionKey: false },
);

export const SchoolSettings = mongoose.model<ISchoolSettings>('SchoolSettings', schoolSettingsSchema);
