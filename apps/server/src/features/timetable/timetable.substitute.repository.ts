import { TimetableSubstitute, ITimetableSubstitute } from './timetable.substitute.model';

export interface CreateSubstituteData {
  schoolId: string;
  timetableId: string;
  class: string;
  section: string;
  date: Date;
  dayOfWeek: number;
  slotId: string;
  subjectName: string;
  originalTeacherId?: string;
  originalTeacherName?: string;
  substituteTeacherName: string;
  substituteTeacherId?: string;
  reason?: string;
  notes?: string;
  createdBy: string;
}

export interface FindSubstitutesOptions {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  class?: string;
  section?: string;
  timetableId?: string;
}

export const substituteRepository = {
  async create(data: CreateSubstituteData): Promise<ITimetableSubstitute> {
    const sub = new TimetableSubstitute(data);
    return sub.save();
  },

  async findById(id: string, schoolId: string): Promise<ITimetableSubstitute | null> {
    return TimetableSubstitute.findOne({ _id: id, schoolId, isDeleted: false })
      .lean<ITimetableSubstitute>();
  },

  async findAll(schoolId: string, opts: FindSubstitutesOptions = {}) {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;
    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.class)       query.class       = opts.class;
    if (opts.section)     query.section     = opts.section;
    if (opts.timetableId) query.timetableId = opts.timetableId;

    if (opts.dateFrom || opts.dateTo) {
      const range: Record<string, Date> = {};
      if (opts.dateFrom) range.$gte = new Date(opts.dateFrom);
      if (opts.dateTo)   range.$lte = new Date(opts.dateTo);
      query.date = range;
    }

    const [substitutes, total] = await Promise.all([
      TimetableSubstitute.find(query).sort({ date: -1 }).skip(skip).limit(limit)
        .lean<ITimetableSubstitute[]>(),
      TimetableSubstitute.countDocuments(query),
    ]);
    return { substitutes, total, page, limit };
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<ITimetableSubstitute> & { updatedBy?: string },
  ): Promise<ITimetableSubstitute | null> {
    return TimetableSubstitute.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true },
    ).lean<ITimetableSubstitute>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await TimetableSubstitute.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
