import { SchoolSettings, ISchoolSettings } from './school-settings.model';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export const schoolSettingsService = {
  async getSettings(schoolId: string): Promise<ISchoolSettings> {
    const existing = await SchoolSettings.findOne({ schoolId });
    if (existing) return existing;
    return SchoolSettings.create({ schoolId, schoolName: 'FNIC' });
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
