import { MockTest, IMockTest, MockTestStatus, MockTestMode } from './mock-test.model';

export interface CreateMockTestData {
  schoolId: string;
  class: string;
  subject: string;
  chapterIds: string[];
  chapterNames: string[];
  title: string;
  questions: { questionText: string; options: string[]; correctOptionIndex: number; marks: number }[];
  durationMinutes: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  mode: MockTestMode;
  createdBy: string;
}

export interface UpdateMockTestData {
  title?: string;
  questions?: { questionText: string; options: string[]; correctOptionIndex: number; marks: number }[];
  durationMinutes?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  mode?: MockTestMode;
}

export interface ListMockTestsFilter {
  schoolId?: string;
  status?: MockTestStatus;
  class?: string;
  subject?: string;
}

export const mockTestRepository = {
  async create(data: CreateMockTestData): Promise<IMockTest> {
    return MockTest.create({ ...data, status: 'draft' });
  },

  async findById(id: string, schoolId: string): Promise<IMockTest | null> {
    return MockTest.findOne({ _id: id, schoolId });
  },

  async findAll(schoolId: string, filter: ListMockTestsFilter): Promise<IMockTest[]> {
    const query: Record<string, unknown> = { schoolId };
    if (filter.status) query.status = filter.status;
    if (filter.class) query.class = filter.class;
    if (filter.subject) query.subject = filter.subject;
    return MockTest.find(query).sort({ createdAt: -1 }).lean<IMockTest[]>();
  },

  async update(id: string, schoolId: string, data: UpdateMockTestData): Promise<IMockTest | null> {
    return MockTest.findOneAndUpdate({ _id: id, schoolId }, { $set: data }, { new: true });
  },

  async submitForApproval(id: string, schoolId: string): Promise<IMockTest | null> {
    return MockTest.findOneAndUpdate(
      { _id: id, schoolId, status: 'draft' },
      { $set: { status: 'pending_approval', submittedForApprovalAt: new Date() } },
      { new: true },
    );
  },

  // ── Ops Center (internal staff — cross-tenant, no schoolId of their own; see INTERNAL_SCHOOL_ID) ──
  // These deliberately do NOT filter by the caller's own schoolId — Ops Center already sees every
  // school's data everywhere else (Schools, Communications, etc.), gated by permit(OPS_VIEW) instead
  // of tenant isolation. `schoolId` here, when given, is the *target* school ops is authoring for.

  async findByIdOps(id: string): Promise<IMockTest | null> {
    return MockTest.findById(id);
  },

  async updateOps(id: string, data: UpdateMockTestData): Promise<IMockTest | null> {
    return MockTest.findByIdAndUpdate(id, { $set: data }, { new: true });
  },

  async submitForApprovalOps(id: string): Promise<IMockTest | null> {
    return MockTest.findOneAndUpdate(
      { _id: id, status: 'draft' },
      { $set: { status: 'pending_approval', submittedForApprovalAt: new Date() } },
      { new: true },
    );
  },

  async findAllOps(filter: ListMockTestsFilter): Promise<IMockTest[]> {
    const query: Record<string, unknown> = {};
    if (filter.schoolId) query.schoolId = filter.schoolId;
    if (filter.status) query.status = filter.status;
    if (filter.class) query.class = filter.class;
    if (filter.subject) query.subject = filter.subject;
    return MockTest.find(query).sort({ createdAt: -1 }).lean<IMockTest[]>();
  },

  async approve(id: string, schoolId: string, approvedBy: string): Promise<IMockTest | null> {
    return MockTest.findOneAndUpdate(
      { _id: id, schoolId, status: 'pending_approval' },
      { $set: { status: 'approved', approvedBy, approvedAt: new Date() } },
      { new: true },
    );
  },

  async reject(id: string, schoolId: string, rejectedBy: string, reason?: string): Promise<IMockTest | null> {
    return MockTest.findOneAndUpdate(
      { _id: id, schoolId, status: 'pending_approval' },
      { $set: { status: 'rejected', rejectedBy, rejectedAt: new Date(), rejectionReason: reason } },
      { new: true },
    );
  },

  async listPendingApproval(schoolId: string): Promise<IMockTest[]> {
    return MockTest.find({ schoolId, status: 'pending_approval' }).sort({ submittedForApprovalAt: 1 }).lean<IMockTest[]>();
  },

  // ── Scheduler queries — cross-school, no schoolId filter (every school's tests share one cron tick) ──

  async findApprovedReadyToGoLive(now: Date): Promise<IMockTest[]> {
    return MockTest.find({ status: 'approved', scheduledStart: { $lte: now } });
  },

  async findLiveReadyToClose(now: Date): Promise<IMockTest[]> {
    return MockTest.find({ status: 'live', scheduledEnd: { $lte: now } });
  },

  async markLive(id: string): Promise<IMockTest | null> {
    return MockTest.findOneAndUpdate({ _id: id, status: 'approved' }, { $set: { status: 'live' } }, { new: true });
  },

  async markClosed(id: string): Promise<IMockTest | null> {
    return MockTest.findOneAndUpdate({ _id: id, status: 'live' }, { $set: { status: 'closed' } }, { new: true });
  },

  /** Atomically folds one more anonymous submission's score into the running average — no per-student record kept. */
  async recordAnonymousSubmission(id: string, schoolId: string, scorePercent: number): Promise<void> {
    const test = await MockTest.findOne({ _id: id, schoolId }).select('anonymousSubmissionCount anonymousAverageScorePercent');
    if (!test) return;
    const prevCount = test.anonymousSubmissionCount ?? 0;
    const prevAvg = test.anonymousAverageScorePercent ?? 0;
    const newCount = prevCount + 1;
    const newAvg = (prevAvg * prevCount + scorePercent) / newCount;
    await MockTest.updateOne({ _id: id, schoolId }, { $set: { anonymousSubmissionCount: newCount, anonymousAverageScorePercent: newAvg } });
  },

  async findForClass(schoolId: string, cls: string, statuses: MockTestStatus[]): Promise<IMockTest[]> {
    return MockTest.find({ schoolId, class: cls, status: { $in: statuses } }).sort({ scheduledStart: -1 }).limit(30).lean<IMockTest[]>();
  },
};
