import { StudentChangeRequest, IStudentChangeRequest } from './student-change-request.model';

interface CreateInput {
  studentId: string;
  studentName: string;
  schoolId: string;
  requestedByUserId: string;
  requestedByName: string;
  changes: Record<string, unknown>;
  previousValues: Record<string, unknown>;
}

export const studentChangeRequestRepository = {
  async create(data: CreateInput): Promise<IStudentChangeRequest> {
    return StudentChangeRequest.create(data);
  },

  async findPending(schoolId: string): Promise<IStudentChangeRequest[]> {
    return StudentChangeRequest.find({ schoolId, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean<IStudentChangeRequest[]>();
  },

  /** Narrow, any-role-safe lookup — unlike findPending (admin/principal-only,
   *  school-wide), this only ever returns requests for one specific student. */
  async findPendingForStudent(schoolId: string, studentId: string): Promise<IStudentChangeRequest[]> {
    return StudentChangeRequest.find({ schoolId, studentId, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean<IStudentChangeRequest[]>();
  },

  async findById(id: string, schoolId: string): Promise<IStudentChangeRequest | null> {
    return StudentChangeRequest.findOne({ _id: id, schoolId });
  },

  async markApproved(id: string, reviewedByName: string): Promise<IStudentChangeRequest | null> {
    return StudentChangeRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'approved', reviewedByName, reviewedAt: new Date() } },
      { new: true },
    ).lean<IStudentChangeRequest>();
  },

  async markRejected(
    id: string,
    reviewedByName: string,
    reviewNote?: string,
  ): Promise<IStudentChangeRequest | null> {
    return StudentChangeRequest.findByIdAndUpdate(
      id,
      { $set: { status: 'rejected', reviewedByName, reviewNote, reviewedAt: new Date() } },
      { new: true },
    ).lean<IStudentChangeRequest>();
  },
};
