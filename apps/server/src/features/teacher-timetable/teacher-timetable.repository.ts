import { TeacherTimetable, ITeacherTimetable, ITeacherTimetableEntry, TeacherTimetableStatus } from './teacher-timetable.model';

export interface GetOrCreateData {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  createdBy: string;
}

export const teacherTimetableRepository = {
  async getOrCreate(data: GetOrCreateData): Promise<ITeacherTimetable> {
    const existing = await TeacherTimetable.findOne({
      schoolId: data.schoolId, teacherId: data.teacherId, academicYear: data.academicYear, isDeleted: false,
    });
    if (existing) return existing.toObject() as ITeacherTimetable;

    const created = new TeacherTimetable({
      schoolId:     data.schoolId,
      teacherId:    data.teacherId,
      teacherName:  data.teacherName,
      academicYear: data.academicYear,
      createdBy:    data.createdBy,
    });
    await created.save();
    return created.toObject() as ITeacherTimetable;
  },

  async findById(id: string, schoolId: string): Promise<ITeacherTimetable | null> {
    return TeacherTimetable.findOne({ _id: id, schoolId, isDeleted: false }).lean<ITeacherTimetable>();
  },

  /** Most recently updated active schedule for a teacher, regardless of academic year — what "My Timetable" shows. */
  async findLatestForTeacher(schoolId: string, teacherId: string): Promise<ITeacherTimetable | null> {
    return TeacherTimetable.findOne({ schoolId, teacherId, isDeleted: false })
      .sort({ updatedAt: -1 })
      .lean<ITeacherTimetable>();
  },

  async bulkUpdateEntries(
    id: string,
    schoolId: string,
    entries: ITeacherTimetableEntry[],
    updatedBy: string,
  ): Promise<ITeacherTimetable | null> {
    return TeacherTimetable.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { entries, updatedBy } },
      { new: true },
    ).lean<ITeacherTimetable>();
  },

  async updateStatus(
    id: string,
    schoolId: string,
    status: TeacherTimetableStatus,
    updatedBy: string,
    extra: Record<string, unknown> = {},
  ): Promise<ITeacherTimetable | null> {
    return TeacherTimetable.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { status, updatedBy, ...extra } },
      { new: true },
    ).lean<ITeacherTimetable>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await TeacherTimetable.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
