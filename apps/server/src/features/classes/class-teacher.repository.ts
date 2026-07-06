import { ClassTeacherAssignment, IClassTeacherAssignment } from './class-teacher.model';

export const classTeacherRepository = {
  async findAll(schoolId: string): Promise<IClassTeacherAssignment[]> {
    return ClassTeacherAssignment.find({ schoolId }).lean<IClassTeacherAssignment[]>();
  },

  async findOne(schoolId: string, cls: string, section: string): Promise<IClassTeacherAssignment | null> {
    return ClassTeacherAssignment.findOne({ schoolId, class: cls, section }).lean<IClassTeacherAssignment>();
  },

  async upsert(
    schoolId: string,
    cls: string,
    section: string,
    teacherId: string,
    teacherName: string,
    updatedBy: string,
  ): Promise<IClassTeacherAssignment> {
    return ClassTeacherAssignment.findOneAndUpdate(
      { schoolId, class: cls, section },
      { $set: { teacherId, teacherName, updatedBy } },
      { new: true, upsert: true },
    ).lean<IClassTeacherAssignment>() as Promise<IClassTeacherAssignment>;
  },
};
