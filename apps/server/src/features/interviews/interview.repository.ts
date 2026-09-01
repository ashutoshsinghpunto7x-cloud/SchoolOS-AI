import { Interview, IInterview, InterviewMode, InterviewStatus, IInterviewFeedback } from './interview.model';

export interface CreateInterviewData {
  schoolId: string;
  candidateId: string;
  round: number;
  scheduledAt: Date;
  mode: InterviewMode;
  interviewerIds: string[];
  interviewerNames: string[];
  createdBy: string;
}

export interface FindInterviewsOptions {
  page?: number;
  limit?: number;
  candidateId?: string;
  status?: InterviewStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginatedInterviews {
  interviews: IInterview[];
  total: number;
  page: number;
  limit: number;
}

export const interviewRepository = {
  async create(data: CreateInterviewData): Promise<IInterview> {
    const interview = new Interview({ ...data, status: 'scheduled' });
    return interview.save();
  },

  async findById(id: string, schoolId: string): Promise<IInterview | null> {
    return Interview.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findByCandidateId(candidateId: string, schoolId: string): Promise<IInterview[]> {
    return Interview.find({ candidateId, schoolId, isDeleted: false }).sort({ round: 1 }).lean<IInterview[]>();
  },

  async countRoundsForCandidate(candidateId: string, schoolId: string): Promise<number> {
    return Interview.countDocuments({ candidateId, schoolId, isDeleted: false });
  },

  async findAll(schoolId: string, opts: FindInterviewsOptions = {}): Promise<PaginatedInterviews> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.candidateId) query.candidateId = opts.candidateId;
    if (opts.status)      query.status = opts.status;
    if (opts.dateFrom || opts.dateTo) {
      const range: Record<string, Date> = {};
      if (opts.dateFrom) range.$gte = opts.dateFrom;
      if (opts.dateTo)   range.$lte = opts.dateTo;
      query.scheduledAt = range;
    }

    const [interviews, total] = await Promise.all([
      Interview.find(query).sort({ scheduledAt: 1 }).skip(skip).limit(limit).lean<IInterview[]>(),
      Interview.countDocuments(query),
    ]);

    return { interviews, total, page, limit };
  },

  async setStatus(id: string, schoolId: string, status: InterviewStatus): Promise<IInterview | null> {
    return Interview.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { status } },
      { new: true },
    );
  },

  async reschedule(id: string, schoolId: string, scheduledAt: Date): Promise<IInterview | null> {
    return Interview.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { scheduledAt, status: 'scheduled' } },
      { new: true },
    );
  },

  async addFeedback(id: string, schoolId: string, feedback: Omit<IInterviewFeedback, '_id'>): Promise<IInterview | null> {
    return Interview.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $push: { feedback } },
      { new: true },
    );
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Interview.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Today's interviews for the Principal Dashboard's merged schedule
   *  (Module 7 — combines with VisitorAppointment's same-day view). */
  async findScheduledBetween(schoolId: string, start: Date, end: Date): Promise<IInterview[]> {
    return Interview.find({
      schoolId, isDeleted: false, status: 'scheduled', scheduledAt: { $gte: start, $lte: end },
    }).sort({ scheduledAt: 1 }).lean<IInterview[]>();
  },
};
