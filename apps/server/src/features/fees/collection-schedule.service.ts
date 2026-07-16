import { collectionScheduleRepository } from './collection-schedule.repository';
import { feeStructureService } from './fee-structure.service';
import { ACADEMIC_MONTH_ORDER } from './fee.service';
import { upsertCollectionScheduleSchema, useDefaultScheduleSchema } from './collection-schedule.validation';
import { ICollectionSchedule } from './collection-schedule.model';
import { AuthContext } from '../../lib/auth-context';
import { NotFoundError } from '../../middlewares/errorHandler';

export const collectionScheduleService = {
  async list(schoolId: string, academicYear: string): Promise<ICollectionSchedule[]> {
    return collectionScheduleRepository.findAll(schoolId, academicYear);
  },

  async upsert(rawInput: unknown, ctx: AuthContext): Promise<ICollectionSchedule> {
    const data = upsertCollectionScheduleSchema.parse(rawInput);
    return collectionScheduleRepository.upsert(ctx.schoolId, data.academicYear, data.depositMonth, data.items, ctx.displayName);
  },

  async remove(schoolId: string, academicYear: string, depositMonth: string): Promise<void> {
    const deleted = await collectionScheduleRepository.remove(schoolId, academicYear, depositMonth);
    if (!deleted) throw new NotFoundError('Collection schedule entry');
  },

  /**
   * The common case for most schools: each academic month's fee components
   * are collected in that same calendar month, one deposit month per
   * academic month. Overwrites whatever schedule already exists for the year.
   */
  async useDefaultSchedule(rawInput: unknown, ctx: AuthContext): Promise<ICollectionSchedule[]> {
    const { academicYear } = useDefaultScheduleSchema.parse(rawInput);
    const template = await feeStructureService.getTemplate(ctx.schoolId, academicYear);

    await collectionScheduleRepository.removeAll(ctx.schoolId, academicYear);

    const results: ICollectionSchedule[] = [];
    for (const month of ACADEMIC_MONTH_ORDER) {
      const items = template
        .filter((t) => (t.month ?? null) === month)
        .map((t) => ({ academicMonth: month, feeHead: t.feeHead }));
      if (!items.length) continue;
      const saved = await collectionScheduleRepository.upsert(ctx.schoolId, academicYear, month, items, ctx.displayName);
      results.push(saved);
    }
    return results;
  },
};
