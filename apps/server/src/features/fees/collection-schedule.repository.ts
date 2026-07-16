import { CollectionSchedule, ICollectionSchedule, ICollectionScheduleItem } from './collection-schedule.model';

export const collectionScheduleRepository = {
  async findAll(schoolId: string, academicYear: string): Promise<ICollectionSchedule[]> {
    return CollectionSchedule.find({ schoolId, academicYear }).lean<ICollectionSchedule[]>();
  },

  async upsert(
    schoolId: string, academicYear: string, depositMonth: string, items: ICollectionScheduleItem[], updatedBy: string,
  ): Promise<ICollectionSchedule> {
    return CollectionSchedule.findOneAndUpdate(
      { schoolId, academicYear, depositMonth },
      { $set: { items, updatedBy } },
      { new: true, upsert: true },
    ).lean<ICollectionSchedule>() as Promise<ICollectionSchedule>;
  },

  async remove(schoolId: string, academicYear: string, depositMonth: string): Promise<boolean> {
    const result = await CollectionSchedule.deleteOne({ schoolId, academicYear, depositMonth });
    return result.deletedCount > 0;
  },

  async removeAll(schoolId: string, academicYear: string): Promise<void> {
    await CollectionSchedule.deleteMany({ schoolId, academicYear });
  },
};
