import { RecoveryRequest, IRecoveryRequest, RecoveryRequestStatus } from './recovery-request.model';

interface CreateInput {
  schoolId: string;
  employeeId: string;
  email: string;
  userId?: string;
  ipAddress?: string;
  browser?: string;
  device?: string;
}

export const recoveryRequestRepository = {
  async create(data: CreateInput): Promise<IRecoveryRequest> {
    return RecoveryRequest.create(data);
  },

  async findById(id: string, schoolId: string): Promise<IRecoveryRequest | null> {
    return RecoveryRequest.findOne({ _id: id, schoolId }).lean<IRecoveryRequest>();
  },

  async findAll(schoolId: string, status?: RecoveryRequestStatus): Promise<IRecoveryRequest[]> {
    const query: Record<string, unknown> = { schoolId };
    if (status) query.status = status;
    return RecoveryRequest.find(query).sort({ createdAt: -1 }).lean<IRecoveryRequest[]>();
  },

  async hasPendingForEmail(email: string): Promise<boolean> {
    const count = await RecoveryRequest.countDocuments({ email: email.toLowerCase(), status: 'pending' });
    return count > 0;
  },

  async findLatestApprovedForUser(userId: string): Promise<IRecoveryRequest | null> {
    return RecoveryRequest.findOne({ userId, status: 'approved' }).sort({ approvedAt: -1 }).lean<IRecoveryRequest>();
  },

  async markApproved(id: string, approvedBy: string, temporaryPasswordExpiresAt: Date): Promise<IRecoveryRequest | null> {
    return RecoveryRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'approved', approvedAt: new Date(), approvedBy, temporaryPasswordExpiresAt } },
      { new: true },
    ).lean<IRecoveryRequest>();
  },

  async markRejected(id: string, rejectionReason: string | undefined): Promise<IRecoveryRequest | null> {
    return RecoveryRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'rejected', rejectionReason } },
      { new: true },
    ).lean<IRecoveryRequest>();
  },

  async markCompleted(id: string): Promise<void> {
    await RecoveryRequest.updateOne({ _id: id }, { $set: { status: 'completed', completedAt: new Date() } });
  },
};
