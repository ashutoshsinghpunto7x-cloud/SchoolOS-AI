import { schoolClassRepository } from './school-class.repository';
import { createSchoolClassSchema, sectionSchema } from './school-class.validation';
import { ISchoolClass } from './school-class.model';
import { studentRepository } from '../students/student.repository';
import { feeRepository } from '../fees/fee.repository';
import { AuthContext } from '../../lib/auth-context';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import type { ClassFeeOverviewRow } from '@schoolos/types';

export const schoolClassService = {
  async list(schoolId: string): Promise<ISchoolClass[]> {
    return schoolClassRepository.findAll(schoolId);
  },

  /** Every class+section in the catalog, with student count and collected/pending
   * fee totals — the school-wide overview shown to Principal/Admin. Sections with
   * no fee records yet still show up with zeros, so nothing silently goes missing. */
  async getFeeOverview(schoolId: string): Promise<ClassFeeOverviewRow[]> {
    const [classes, totals, counts] = await Promise.all([
      schoolClassRepository.findAll(schoolId),
      feeRepository.getClassSectionTotals(schoolId),
      studentRepository.getClassSectionCounts(schoolId),
    ]);

    const totalsMap = new Map(totals.map((t) => [`${t.class.toLowerCase()}||${t.section.toLowerCase()}`, t]));
    const countsMap = new Map(counts.map((c) => [`${c.class.toLowerCase()}||${c.section.toLowerCase()}`, c.count]));

    const rows: ClassFeeOverviewRow[] = [];
    for (const cls of classes) {
      for (const section of cls.sections) {
        const key = `${cls.name.toLowerCase()}||${section.toLowerCase()}`;
        const t = totalsMap.get(key);
        rows.push({
          class: cls.name,
          section,
          studentCount: countsMap.get(key) ?? 0,
          collected: t?.collected ?? 0,
          pending: t?.pending ?? 0,
        });
      }
    }
    return rows.sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }) || a.section.localeCompare(b.section));
  },

  async create(rawInput: unknown, ctx: AuthContext): Promise<ISchoolClass> {
    const { name } = createSchoolClassSchema.parse(rawInput);
    const existing = await schoolClassRepository.findAll(ctx.schoolId);
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new ValidationError(`Class "${name}" already exists.`);
    }
    return schoolClassRepository.create(ctx.schoolId, name, ctx.displayName);
  },

  /** Renames a class, and cascades the new name onto every student currently under
   * the old one — Student.class is free text with no foreign key to this catalog,
   * so without the cascade the roster would keep showing the old (wrong) name. */
  async rename(id: string, rawInput: unknown, ctx: AuthContext): Promise<ISchoolClass> {
    const { name } = createSchoolClassSchema.parse(rawInput);
    const existing = await schoolClassRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Class');

    if (existing.name.toLowerCase() !== name.toLowerCase()) {
      const all = await schoolClassRepository.findAll(ctx.schoolId);
      if (all.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        throw new ValidationError(`Class "${name}" already exists.`);
      }
    }

    const updated = await schoolClassRepository.rename(id, ctx.schoolId, name, ctx.displayName);
    if (!updated) throw new NotFoundError('Class');

    if (existing.name !== name) {
      await studentRepository.renameClass(ctx.schoolId, existing.name, name);
    }

    return updated;
  },

  async addSection(id: string, rawInput: unknown, ctx: AuthContext): Promise<ISchoolClass> {
    const { section } = sectionSchema.parse(rawInput);
    const updated = await schoolClassRepository.addSection(id, ctx.schoolId, section, ctx.displayName);
    if (!updated) throw new NotFoundError('Class');
    return updated;
  },

  async removeSection(id: string, rawInput: unknown, ctx: AuthContext): Promise<ISchoolClass> {
    const { section } = sectionSchema.parse(rawInput);
    const updated = await schoolClassRepository.removeSection(id, ctx.schoolId, section, ctx.displayName);
    if (!updated) throw new NotFoundError('Class');
    return updated;
  },

  async remove(id: string, ctx: AuthContext): Promise<void> {
    const deleted = await schoolClassRepository.delete(id, ctx.schoolId);
    if (!deleted) throw new NotFoundError('Class');
  },
};
