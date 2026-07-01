import mongoose from 'mongoose';
import { Communication, ICommunication, CommunicationType, CommStatus, CommProvider, CommDirection } from './communication.model';

// ── Payload types ─────────────────────────────────────────────────────────────

export interface CreatePayload {
  studentId: string;
  parentId?: string;
  campaignId?: string;
  type: CommunicationType;
  status: CommStatus;
  provider: CommProvider;
  direction?: CommDirection;
  title: string;
  message?: string;
  summary?: string;
  schoolId: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePayload {
  status?: CommStatus;
  message?: string;
  summary?: string;
  recommendation?: string;
  nextFollowUp?: string;
  metadata?: Record<string, unknown>;
}

export interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: CommunicationType;
  status?: CommStatus;
  studentId?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCommunications {
  data: ICommunication[];
  meta: { page: number; limit: number; total: number };
}

// ── Repository ────────────────────────────────────────────────────────────────

export const communicationRepository = {
  async create(data: CreatePayload): Promise<ICommunication> {
    const doc = new Communication({
      ...data,
      studentId: new mongoose.Types.ObjectId(data.studentId),
    });
    return doc.save();
  },

  async findById(id: string, schoolId?: string): Promise<ICommunication | null> {
    const filter: Record<string, unknown> = { _id: id };
    if (schoolId) filter.schoolId = schoolId;
    return Communication.findOne(filter).lean<ICommunication>();
  },

  async updateById(id: string, data: UpdatePayload, schoolId?: string): Promise<ICommunication | null> {
    const filter: Record<string, unknown> = { _id: id };
    if (schoolId) filter.schoolId = schoolId;
    return Communication.findOneAndUpdate(
      filter,
      { $set: data },
      { new: true, runValidators: true }
    ).lean<ICommunication>();
  },

  /** Global paginated list for a school, with optional filters. */
  async findAll(schoolId: string, opts: FindAllOptions = {}): Promise<PaginatedCommunications> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;
    const sortDir = opts.sortOrder === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = { schoolId };
    if (opts.type) filter.type = opts.type;
    if (opts.status) filter.status = opts.status;
    if (opts.studentId) {
      filter.studentId = new mongoose.Types.ObjectId(opts.studentId);
    }
    if (opts.search) {
      const escaped = opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { summary: { $regex: escaped, $options: 'i' } },
        { createdBy: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      Communication.find(filter)
        .sort({ createdAt: sortDir })
        .skip(skip)
        .limit(limit)
        .lean<ICommunication[]>(),
      Communication.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
  },

  /** Student-scoped paginated list. */
  async findByStudent(
    studentId: string,
    schoolId: string,
    opts: Omit<FindAllOptions, 'studentId'> = {}
  ): Promise<ICommunication[]> {
    const sortDir = opts.sortOrder === 'asc' ? 1 : -1;
    const filter: Record<string, unknown> = {
      studentId: new mongoose.Types.ObjectId(studentId),
      schoolId,
    };
    if (opts.type) filter.type = opts.type;
    if (opts.status) filter.status = opts.status;

    return Communication.find(filter)
      .sort({ createdAt: sortDir })
      .lean<ICommunication[]>();
  },
};
