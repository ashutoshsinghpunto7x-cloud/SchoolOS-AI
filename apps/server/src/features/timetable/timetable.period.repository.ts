import { PeriodSlot, IPeriodSlot } from './timetable.period.model';

export interface CreatePeriodSlotData {
  schoolId: string;
  name: string;
  orderIndex: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  daysApplicable: number[];
  createdBy: string;
}

export const periodSlotRepository = {
  async findAll(schoolId: string): Promise<IPeriodSlot[]> {
    return PeriodSlot.find({ schoolId, isDeleted: false })
      .sort({ orderIndex: 1 })
      .lean<IPeriodSlot[]>();
  },

  async findById(id: string, schoolId: string): Promise<IPeriodSlot | null> {
    return PeriodSlot.findOne({ _id: id, schoolId, isDeleted: false }).lean<IPeriodSlot>();
  },

  async create(data: CreatePeriodSlotData): Promise<IPeriodSlot> {
    const slot = new PeriodSlot(data);
    return slot.save();
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<IPeriodSlot> & { updatedBy?: string },
  ): Promise<IPeriodSlot | null> {
    return PeriodSlot.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IPeriodSlot>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await PeriodSlot.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  async reorder(schoolId: string, orderedIds: string[]): Promise<void> {
    const ops = orderedIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id, schoolId },
        update: { $set: { orderIndex: idx } },
      },
    }));
    if (ops.length) await PeriodSlot.bulkWrite(ops);
  },
};
