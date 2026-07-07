import { LeaveRequest, ILeaveRequest } from './leave-request.model';

interface CreateInput {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  requestedByUserId: string;
  leaveType: 'full_day' | 'half_day';
  dateFrom: string;
  dateTo: string;
  reason: string;
}

export const leaveRequestRepository = {
  async create(data: CreateInput): Promise<ILeaveRequest> {
    return LeaveRequest.create(data);
  },

  async findMine(schoolId: string, teacherId: string): Promise<ILeaveRequest[]> {
    return LeaveRequest.find({ schoolId, teacherId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<ILeaveRequest[]>();
  },

  async findPending(schoolId: string): Promise<ILeaveRequest[]> {
    return LeaveRequest.find({ schoolId, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean<ILeaveRequest[]>();
  },

  async findById(id: string, schoolId: string): Promise<ILeaveRequest | null> {
    return LeaveRequest.findOne({ _id: id, schoolId });
  },

  async markApproved(id: string, reviewedByName: string): Promise<ILeaveRequest | null> {
    return LeaveRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'approved', reviewedByName, reviewedAt: new Date() } },
      { new: true },
    ).lean<ILeaveRequest>();
  },

  async markRejected(
    id: string,
    reviewedByName: string,
    reviewNote?: string,
  ): Promise<ILeaveRequest | null> {
    return LeaveRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'rejected', reviewedByName, reviewNote, reviewedAt: new Date() } },
      { new: true },
    ).lean<ILeaveRequest>();
  },
};
