import { FeeDiscountRequest, IFeeDiscountRequest } from './fee-discount-request.model';

interface CreateInput {
  schoolId: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  requestedAmount: number;
  reason: string;
  requestedByName: string;
}

export const feeDiscountRequestRepository = {
  async create(data: CreateInput): Promise<IFeeDiscountRequest> {
    return FeeDiscountRequest.create(data);
  },

  async findById(id: string, schoolId: string): Promise<IFeeDiscountRequest | null> {
    return FeeDiscountRequest.findOne({ _id: id, schoolId }).lean<IFeeDiscountRequest>();
  },

  async findPending(schoolId: string): Promise<IFeeDiscountRequest[]> {
    return FeeDiscountRequest.find({ schoolId, status: 'pending' }).sort({ createdAt: -1 }).lean<IFeeDiscountRequest[]>();
  },

  async findByStudent(schoolId: string, studentId: string): Promise<IFeeDiscountRequest[]> {
    return FeeDiscountRequest.find({ schoolId, studentId }).sort({ createdAt: -1 }).lean<IFeeDiscountRequest[]>();
  },

  async hasPending(schoolId: string, studentId: string): Promise<boolean> {
    const count = await FeeDiscountRequest.countDocuments({ schoolId, studentId, status: 'pending' });
    return count > 0;
  },

  async markApproved(id: string, reviewedByName: string, reviewNote: string | undefined): Promise<IFeeDiscountRequest | null> {
    return FeeDiscountRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'approved', reviewedByName, reviewNote, reviewedAt: new Date() } },
      { new: true },
    ).lean<IFeeDiscountRequest>();
  },

  async markRejected(id: string, reviewedByName: string, reviewNote: string | undefined): Promise<IFeeDiscountRequest | null> {
    return FeeDiscountRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'rejected', reviewedByName, reviewNote, reviewedAt: new Date() } },
      { new: true },
    ).lean<IFeeDiscountRequest>();
  },
};
