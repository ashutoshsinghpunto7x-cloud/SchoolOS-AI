import { SchoolClass, ISchoolClass } from './school-class.model';

export const schoolClassRepository = {
  async findAll(schoolId: string): Promise<ISchoolClass[]> {
    return SchoolClass.find({ schoolId }).sort({ name: 1 }).lean<ISchoolClass[]>();
  },

  async findById(id: string, schoolId: string): Promise<ISchoolClass | null> {
    return SchoolClass.findOne({ _id: id, schoolId }).lean<ISchoolClass>();
  },

  async create(schoolId: string, name: string, createdBy: string): Promise<ISchoolClass> {
    return SchoolClass.create({ schoolId, name, sections: [], createdBy });
  },

  async addSection(id: string, schoolId: string, section: string, updatedBy: string): Promise<ISchoolClass | null> {
    return SchoolClass.findOneAndUpdate(
      { _id: id, schoolId },
      { $addToSet: { sections: section }, $set: { updatedBy } },
      { new: true },
    ).lean<ISchoolClass>();
  },

  async rename(id: string, schoolId: string, name: string, updatedBy: string): Promise<ISchoolClass | null> {
    return SchoolClass.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { name, updatedBy } },
      { new: true },
    ).lean<ISchoolClass>();
  },

  async removeSection(id: string, schoolId: string, section: string, updatedBy: string): Promise<ISchoolClass | null> {
    return SchoolClass.findOneAndUpdate(
      { _id: id, schoolId },
      { $pull: { sections: section }, $set: { updatedBy } },
      { new: true },
    ).lean<ISchoolClass>();
  },

  async delete(id: string, schoolId: string): Promise<boolean> {
    const result = await SchoolClass.deleteOne({ _id: id, schoolId });
    return result.deletedCount > 0;
  },
};
