import { AcademicYear, IAcademicYear, IAcademicTerm, SpecialDayType } from './academic-year.model';

export interface UpsertAcademicYearData {
  schoolId: string;
  label: string;
  startDate: Date;
  endDate: Date;
  weeklyOffDays?: number[];
  terms?: IAcademicTerm[];
}

export const academicYearRepository = {
  async findActive(schoolId: string): Promise<IAcademicYear | null> {
    return AcademicYear.findOne({ schoolId, status: 'active' }).sort({ startDate: -1 }).lean<IAcademicYear>();
  },

  async findCovering(schoolId: string, date: Date): Promise<IAcademicYear | null> {
    return AcademicYear.findOne({ schoolId, startDate: { $lte: date }, endDate: { $gte: date } }).lean<IAcademicYear>();
  },

  async create(data: UpsertAcademicYearData): Promise<IAcademicYear> {
    return AcademicYear.create({ ...data, status: 'active' });
  },

  async update(id: string, schoolId: string, data: Partial<UpsertAcademicYearData>): Promise<IAcademicYear | null> {
    return AcademicYear.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: data },
      { new: true },
    ).lean<IAcademicYear>();
  },

  async addSpecialDay(
    id: string,
    schoolId: string,
    specialDay: { date: Date; label: string; type: SpecialDayType; teachingImpact: 'full_day_off' | 'half_day' | 'none' },
  ): Promise<IAcademicYear | null> {
    return AcademicYear.findOneAndUpdate(
      { _id: id, schoolId },
      { $push: { specialDays: specialDay } },
      { new: true },
    ).lean<IAcademicYear>();
  },
};
