import { Candidate, ICandidate, CandidateSource, CandidateStatus } from './candidate.model';

export interface CreateCandidateData {
  schoolId: string;
  name: string;
  mobile: string;
  email?: string;
  positionApplied: string;
  department?: string;
  qualification?: string;
  experienceYears?: number;
  resumeUrl: string;
  resumeKey?: string;
  source: CandidateSource;
  dateReceived: Date;
  receivedById: string;
  receivedByName: string;
}

export interface FindCandidatesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: CandidateStatus;
  positionApplied?: string;
  department?: string;
}

export interface PaginatedCandidates {
  candidates: ICandidate[];
  total: number;
  page: number;
  limit: number;
}

export const candidateRepository = {
  async create(data: CreateCandidateData): Promise<ICandidate> {
    const candidate = new Candidate({ ...data, status: 'new' });
    return candidate.save();
  },

  async findById(id: string, schoolId: string): Promise<ICandidate | null> {
    return Candidate.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findAll(schoolId: string, opts: FindCandidatesOptions = {}): Promise<PaginatedCandidates> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { mobile: regex }, { email: regex }, { positionApplied: regex }];
    }
    if (opts.status)          query.status = opts.status;
    if (opts.positionApplied) query.positionApplied = new RegExp(opts.positionApplied, 'i');
    if (opts.department)      query.department = new RegExp(opts.department, 'i');

    const [candidates, total] = await Promise.all([
      Candidate.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<ICandidate[]>(),
      Candidate.countDocuments(query),
    ]);

    return { candidates, total, page, limit };
  },

  /** Non-rejected candidates already on file with this phone/email — Module
   *  5's "duplicate detection ... so the same candidate re-applying doesn't
   *  create noise." Informational only (see candidate.service.ts): reception
   *  still sees it and decides, since a genuine second application for a
   *  different role is legitimate. */
  async findActiveDuplicates(schoolId: string, mobile?: string, email?: string): Promise<ICandidate[]> {
    const or: Record<string, unknown>[] = [];
    if (mobile) or.push({ mobile });
    if (email) or.push({ email });
    if (or.length === 0) return [];
    return Candidate.find({
      schoolId, isDeleted: false, status: { $ne: 'rejected' }, $or: or,
    }).sort({ createdAt: -1 }).lean<ICandidate[]>();
  },

  async setStatus(
    id: string, schoolId: string,
    update: {
      status: CandidateStatus; rejectionReason?: string;
      forwardedTo?: string; forwardedToName?: string; forwardedAt?: Date;
    },
  ): Promise<ICandidate | null> {
    return Candidate.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: update },
      { new: true },
    );
  },

  /** Module 6 — Principal's final call after interviews. `status` carries
   *  the decision (selected/hold/rejected) rather than a separate field —
   *  see the model file comment for why. */
  async setFinalDecision(
    id: string, schoolId: string,
    update: {
      status: 'selected' | 'hold' | 'rejected';
      salaryDiscussionNotes?: string; offeredSalary?: number; joiningDate?: Date; rejectionReason?: string;
    },
  ): Promise<ICandidate | null> {
    return Candidate.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: update },
      { new: true },
    );
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Candidate.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
