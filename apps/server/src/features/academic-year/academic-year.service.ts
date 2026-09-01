import { AuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';
import { SchoolSettings } from '../school-settings/school-settings.model';
import { academicYearRepository } from './academic-year.repository';
import { IAcademicYear } from './academic-year.model';
import { UpsertAcademicYearInput, AddSpecialDayInput } from './academic-year.validation';

export const academicYearService = {
  /** GET /academic-year/current — the school's active AcademicYear, seeded on
   *  first read from SchoolSettings.academicYearStart/End if none exists yet
   *  (Phase 1: no dedicated setup-wizard UI, so this is the migration path —
   *  see "The Planning Engine" §9). Throws the same message Teacher Planner
   *  v2 used so existing "ask your admin" guidance still applies. */
  async getOrSeedCurrent(ctx: AuthContext): Promise<IAcademicYear> {
    const existing = await academicYearRepository.findActive(ctx.schoolId);
    if (existing) return existing;

    const settings = await SchoolSettings.findOne({ schoolId: ctx.schoolId })
      .select('academicYearStart academicYearEnd')
      .lean() as { academicYearStart?: Date; academicYearEnd?: Date } | null;

    if (!settings?.academicYearStart || !settings?.academicYearEnd) {
      throw new ValidationError('Academic year is not configured yet — ask your admin/principal to set it in School Settings.');
    }

    return academicYearRepository.create({
      schoolId: ctx.schoolId,
      label: `${settings.academicYearStart.getFullYear()}-${settings.academicYearEnd.getFullYear()}`,
      startDate: settings.academicYearStart,
      endDate: settings.academicYearEnd,
      weeklyOffDays: [0, 6],
      terms: [],
    });
  },

  async upsert(data: UpsertAcademicYearInput, ctx: AuthContext): Promise<IAcademicYear> {
    const existing = await academicYearRepository.findActive(ctx.schoolId);
    const terms = data.terms.map((t) => ({ ...t, startDate: t.startDate, endDate: t.endDate }));

    if (existing) {
      const updated = await academicYearRepository.update(String(existing._id), ctx.schoolId, {
        label: data.label,
        startDate: data.startDate,
        endDate: data.endDate,
        weeklyOffDays: data.weeklyOffDays,
        terms,
      });
      return updated!;
    }

    return academicYearRepository.create({
      schoolId: ctx.schoolId,
      label: data.label,
      startDate: data.startDate,
      endDate: data.endDate,
      weeklyOffDays: data.weeklyOffDays,
      terms,
    });
  },

  async addSpecialDay(data: AddSpecialDayInput, ctx: AuthContext): Promise<IAcademicYear> {
    const year = await this.getOrSeedCurrent(ctx);
    const updated = await academicYearRepository.addSpecialDay(String(year._id), ctx.schoolId, {
      date: data.date,
      label: data.label,
      type: data.type,
      teachingImpact: data.teachingImpact,
    });
    if (!updated) throw new ValidationError('Could not add special day');
    return updated;
  },
};
