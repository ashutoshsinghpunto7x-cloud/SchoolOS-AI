import { SchoolSettings, ISchoolSettings, IAttendanceRules, IPayrollConfig, IBehaviorWindow, IAttendanceEditPolicy, ICommunicationSettings, DEFAULT_BEHAVIOR_WINDOW, DEFAULT_COMMUNICATION_SETTINGS } from './school-settings.model';
import { updateAttendanceRulesSchema, updatePayrollConfigSchema, updateBehaviorWindowSchema, updateAttendanceEditPolicySchema, updateReportCardBrandingSchema, updateCommunicationSettingsSchema, updateAcademicYearSchema } from './school-settings.validation';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export const schoolSettingsService = {
  async getSettings(schoolId: string): Promise<ISchoolSettings> {
    const existing = await SchoolSettings.findOne({ schoolId });
    if (!existing) return SchoolSettings.create({ schoolId, schoolName: 'FNIC' });

    // Documents created before the behaviorWindow field existed on the schema
    // never got the default backfilled — heal it in place on first read.
    if (!existing.behaviorWindow) {
      existing.behaviorWindow = { ...DEFAULT_BEHAVIOR_WINDOW };
      await existing.save();
    }
    // Documents created before communicationSettings existed on the schema
    // never got the default backfilled — heal it in place on first read.
    if (!existing.communicationSettings) {
      existing.communicationSettings = { ...DEFAULT_COMMUNICATION_SETTINGS };
      await existing.save();
    }
    // Documents created before attendanceEditPolicy existed on the schema
    // never got the default backfilled — heal it in place on first read.
    if (!existing.attendanceEditPolicy) {
      existing.attendanceEditPolicy = {};
      await existing.save();
    }
    return existing;
  },

  async updateAttendanceRules(rawInput: unknown, ctx: AuthContext): Promise<ISchoolSettings> {
    const rules: IAttendanceRules = updateAttendanceRulesSchema.parse(rawInput);

    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { attendanceRules: rules, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'school_settings.attendance_rules_updated', resource: 'school_settings', resourceId: ctx.schoolId,
      details: { ...rules }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updatePayrollConfig(rawInput: unknown, ctx: AuthContext): Promise<ISchoolSettings> {
    const config: IPayrollConfig = updatePayrollConfigSchema.parse(rawInput);

    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { payrollConfig: config, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'school_settings.payroll_config_updated', resource: 'school_settings', resourceId: ctx.schoolId,
      details: { ...config }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updateBehaviorWindow(rawInput: unknown, ctx: AuthContext): Promise<ISchoolSettings> {
    const window: IBehaviorWindow = updateBehaviorWindowSchema.parse(rawInput);

    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { behaviorWindow: window, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'school_settings.behavior_window_updated', resource: 'school_settings', resourceId: ctx.schoolId,
      details: { ...window }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updateAttendanceEditPolicy(rawInput: unknown, ctx: AuthContext): Promise<ISchoolSettings> {
    const policy: IAttendanceEditPolicy = updateAttendanceEditPolicySchema.parse(rawInput);

    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { attendanceEditPolicy: policy, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'school_settings.attendance_edit_policy_updated', resource: 'school_settings', resourceId: ctx.schoolId,
      details: { ...policy }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updateReportCardBranding(rawInput: unknown, ctx: AuthContext): Promise<ISchoolSettings> {
    const branding = updateReportCardBrandingSchema.parse(rawInput);

    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { reportCardBranding: branding, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'school_settings.report_card_branding_updated', resource: 'school_settings', resourceId: ctx.schoolId,
      details: { ...branding }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updateCommunicationSettings(rawInput: unknown, ctx: AuthContext): Promise<ISchoolSettings> {
    const settings: ICommunicationSettings = updateCommunicationSettingsSchema.parse(rawInput);

    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { communicationSettings: settings, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'communication_settings.updated', resource: 'school_settings', resourceId: ctx.schoolId,
      details: { ...settings }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updateAcademicYear(rawInput: unknown, ctx: AuthContext): Promise<ISchoolSettings> {
    const { academicYearStart, academicYearEnd } = updateAcademicYearSchema.parse(rawInput);

    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { academicYearStart, academicYearEnd, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'school_settings.academic_year_updated', resource: 'school_settings', resourceId: ctx.schoolId,
      details: { academicYearStart, academicYearEnd }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async updateLogo(dataUri: string, ctx: AuthContext): Promise<ISchoolSettings> {
    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $set: { logoUrl: dataUri, updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'school_settings.logo_updated', resource: 'school_settings', resourceId: ctx.schoolId,
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async removeLogo(ctx: AuthContext): Promise<ISchoolSettings> {
    const updated = await SchoolSettings.findOneAndUpdate(
      { schoolId: ctx.schoolId },
      { $unset: { logoUrl: '' }, $set: { updatedBy: ctx.displayName }, $setOnInsert: { schoolName: 'FNIC' } },
      { new: true, upsert: true },
    );
    return updated;
  },
};
