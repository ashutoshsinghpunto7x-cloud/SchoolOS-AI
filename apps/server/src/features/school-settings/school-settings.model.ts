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

/** Daily cutoff (HH:mm, IST) after which teachers can no longer edit today's
 *  attendance — undefined `cutoffTime` means no time restriction. Past dates
 *  are always view-only for teachers, independent of this setting (enforced
 *  in attendance.service.ts, not stored here). */
export interface IAttendanceEditPolicy {
  cutoffTime?: string;
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

/** Admin-configurable knobs for the Communication & Notification Engine —
 *  channel on/off switches, auto-notify toggles, and send-safety limits.
 *  Per-notification-type/channel template text itself lives in the
 *  MessageTemplate collection (features/communication), not here. */
export interface ICommunicationSettings {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  attendanceAutoNotify: boolean;
  feeReminderAutoNotify: boolean;
  /** HH:mm 24-hour, IST — outside this window, sends are queued as SKIPPED rather than fired immediately. */
  workingHoursStart: string;
  workingHoursEnd: string;
  /** Max notifications a single school may send per calendar day, across all channels. */
  dailyLimit: number;
  /** Automatic retry attempts for a failed send before it's left as FAILED. */
  retryCount: number;
}

export interface ISchoolSettings extends Document {
  schoolId: string;
  schoolName: string;
  logoUrl?: string;
  attendanceRules: IAttendanceRules;
  payrollConfig: IPayrollConfig;
  behaviorWindow: IBehaviorWindow;
  attendanceEditPolicy: IAttendanceEditPolicy;
  reportCardBranding: IReportCardBranding;
  communicationSettings: ICommunicationSettings;
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

// WhatsApp on by default (the only channel with a real provider today); the
// others stay off until their providers are actually implemented, so enabling
// them can never silently no-op a send.
export const DEFAULT_COMMUNICATION_SETTINGS: ICommunicationSettings = {
  whatsappEnabled: true,
  emailEnabled: false,
  smsEnabled: false,
  pushEnabled: false,
  attendanceAutoNotify: false,
  feeReminderAutoNotify: false,
  workingHoursStart: '08:00',
  workingHoursEnd: '20:00',
  dailyLimit: 5000,
  retryCount: 3,
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

const attendanceEditPolicySchema = new Schema<IAttendanceEditPolicy>(
  {
    cutoffTime: { type: String },
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

const communicationSettingsSchema = new Schema<ICommunicationSettings>(
  {
    whatsappEnabled:       { type: Boolean, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.whatsappEnabled },
    emailEnabled:          { type: Boolean, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.emailEnabled },
    smsEnabled:            { type: Boolean, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.smsEnabled },
    pushEnabled:           { type: Boolean, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.pushEnabled },
    attendanceAutoNotify:  { type: Boolean, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.attendanceAutoNotify },
    feeReminderAutoNotify: { type: Boolean, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.feeReminderAutoNotify },
    workingHoursStart:     { type: String, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.workingHoursStart },
    workingHoursEnd:       { type: String, required: true, default: DEFAULT_COMMUNICATION_SETTINGS.workingHoursEnd },
    dailyLimit:            { type: Number, required: true, min: 1, default: DEFAULT_COMMUNICATION_SETTINGS.dailyLimit },
    retryCount:            { type: Number, required: true, min: 0, max: 10, default: DEFAULT_COMMUNICATION_SETTINGS.retryCount },
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
    attendanceEditPolicy: { type: attendanceEditPolicySchema, default: () => ({}) },
    reportCardBranding:{ type: reportCardBrandingSchema, default: () => ({}) },
    communicationSettings: { type: communicationSettingsSchema, default: () => ({ ...DEFAULT_COMMUNICATION_SETTINGS }) },
    updatedBy:         { type: String },
  },
  { timestamps: true, versionKey: false },
);

export const SchoolSettings = mongoose.model<ISchoolSettings>('SchoolSettings', schoolSettingsSchema);
