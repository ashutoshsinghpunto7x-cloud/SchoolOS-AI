import { FeeStructure, IFeeStructure } from './fee-structure.model';
import type { FeeHead } from './fee.model';

export const feeStructureRepository = {
  async findAll(schoolId: string, academicYear?: string): Promise<IFeeStructure[]> {
    const query: Record<string, unknown> = { schoolId };
    if (academicYear) query.academicYear = academicYear;
    return FeeStructure.find(query).sort({ class: 1, feeHead: 1 }).lean<IFeeStructure[]>();
  },

  async upsert(
    schoolId: string, cls: string, feeHead: FeeHead, academicYear: string, amount: number, updatedBy: string,
  ): Promise<IFeeStructure> {
    return FeeStructure.findOneAndUpdate(
      { schoolId, class: cls, feeHead, academicYear },
      { $set: { amount, updatedBy } },
      { new: true, upsert: true },
    ).lean<IFeeStructure>() as Promise<IFeeStructure>;
  },

  async remove(id: string, schoolId: string): Promise<boolean> {
    const result = await FeeStructure.deleteOne({ _id: id, schoolId });
    return result.deletedCount > 0;
  },
};
