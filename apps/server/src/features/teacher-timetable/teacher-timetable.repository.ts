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

  /** Auto-sync from the class timetable: upsert (by dayOfWeek+slotId) the entry
   * a teacher was just assigned to in a class's Timetable, creating their
   * TeacherTimetable document on first use. */
  async syncEntryFromClassTimetable(data: {
    schoolId: string;
    teacherId: string;
    teacherName: string;
    academicYear: string;
    dayOfWeek: number;
    slotId: string;
    subjectName: string;
    class: string;
    section: string;
    roomNumber?: string;
    updatedBy: string;
  }): Promise<void> {
    await this.getOrCreate({
      schoolId: data.schoolId, teacherId: data.teacherId, teacherName: data.teacherName || 'Teacher',
      academicYear: data.academicYear, createdBy: data.updatedBy,
    });

    await TeacherTimetable.updateOne(
      { schoolId: data.schoolId, teacherId: data.teacherId, academicYear: data.academicYear, isDeleted: false },
      { $pull: { entries: { dayOfWeek: data.dayOfWeek, slotId: data.slotId } } },
    );
    await TeacherTimetable.updateOne(
      { schoolId: data.schoolId, teacherId: data.teacherId, academicYear: data.academicYear, isDeleted: false },
      {
        $push: {
          entries: {
            dayOfWeek: data.dayOfWeek, slotId: data.slotId, subjectName: data.subjectName,
            class: data.class, section: data.section, roomNumber: data.roomNumber,
          },
        },
        $set: { updatedBy: data.updatedBy, ...(data.teacherName ? { teacherName: data.teacherName } : {}) },
      },
    );
  },

  /** Auto-sync from the class timetable: remove the entry for one day/slot
   * (used when a teacher is unassigned or replaced on that slot). No-op if
   * the teacher has no TeacherTimetable document yet. */
  async removeEntryForTeacher(
    schoolId: string, teacherId: string, academicYear: string, dayOfWeek: number, slotId: string, updatedBy: string,
  ): Promise<void> {
    await TeacherTimetable.updateOne(
      { schoolId, teacherId, academicYear, isDeleted: false },
      { $pull: { entries: { dayOfWeek, slotId } }, $set: { updatedBy } },
    );
  },
};
