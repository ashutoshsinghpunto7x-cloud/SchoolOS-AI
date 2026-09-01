import { FollowUp, IFollowUp, FollowUpChannel, FollowUpStatus } from './follow-up.model';
import { Enquiry } from '../enquiries/enquiry.model';

/** A `FollowUp` decorated with just enough of its linked `Enquiry` to render
 *  a daily reminder list (name/phone) without the caller having to look up
 *  each enquiry separately — the SRD's "Daily reminder list" is useless with
 *  bare enquiry ids. Not part of the `FollowUp` schema itself. */
export interface FollowUpWithEnquirySummary extends IFollowUp {
  enquirySummary?: { studentName: string; parentName: string; parentPhone: string } | null;
}

export interface CreateFollowUpData {
  schoolId: string;
  enquiryId: string;
  dueDate: Date;
  assignedToId: string;
  channel: FollowUpChannel;
  createdBy: string;
}

export interface FindFollowUpsOptions {
  page?: number;
  limit?: number;
  enquiryId?: string;
  status?: FollowUpStatus;
  assignedToId?: string;
  dueBy?: Date;
}

export interface PaginatedFollowUps {
  followUps: FollowUpWithEnquirySummary[];
  total: number;
  page: number;
  limit: number;
}

export const followUpRepository = {
  async create(data: CreateFollowUpData): Promise<IFollowUp> {
    const followUp = new FollowUp({ ...data, status: 'pending' });
    return followUp.save();
  },

  async findById(id: string, schoolId: string): Promise<IFollowUp | null> {
    return FollowUp.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findAll(schoolId: string, opts: FindFollowUpsOptions = {}): Promise<PaginatedFollowUps> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.enquiryId)    query.enquiryId = opts.enquiryId;
    if (opts.status)       query.status = opts.status;
    if (opts.assignedToId) query.assignedToId = opts.assignedToId;
    if (opts.dueBy)        query.dueDate = { $lte: opts.dueBy };

    const [followUps, total] = await Promise.all([
      FollowUp.find(query).sort({ dueDate: 1 }).skip(skip).limit(limit).lean<IFollowUp[]>(),
      FollowUp.countDocuments(query),
    ]);

    const enriched = await attachEnquirySummaries(followUps);
    return { followUps: enriched, total, page, limit };
  },

  async setStatus(
    id: string, schoolId: string,
    update: {
      status: FollowUpStatus; outcome?: string; completedAt?: Date;
      nextFollowUpDate?: Date; escalatedAt?: Date;
    },
  ): Promise<IFollowUp | null> {
    return FollowUp.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: update },
      { new: true },
    );
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await FollowUp.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Every pending follow-up whose due date has passed — used by the missed-
   *  follow-up cron (see follow-up-auto.job.ts) to flip status and, once 2+
   *  days overdue, escalate to the principal. */
  async findOverduePending(schoolId?: string): Promise<IFollowUp[]> {
    const query: Record<string, unknown> = { status: 'pending', dueDate: { $lt: new Date() }, isDeleted: false };
    if (schoolId) query.schoolId = schoolId;
    return FollowUp.find(query).lean<IFollowUp[]>();
  },

  /** Missed follow-ups overdue 2+ days that haven't been escalated yet. */
  async findUnescalatedStaleMissed(cutoff: Date): Promise<IFollowUp[]> {
    return FollowUp.find({
      status: 'missed', dueDate: { $lte: cutoff }, escalatedAt: { $exists: false }, isDeleted: false,
    }).lean<IFollowUp[]>();
  },
};

async function attachEnquirySummaries(followUps: IFollowUp[]): Promise<FollowUpWithEnquirySummary[]> {
  if (followUps.length === 0) return [];
  const enquiryIds = [...new Set(followUps.map((f) => f.enquiryId))];
  const enquiries = await Enquiry.find({ _id: { $in: enquiryIds } })
    .select('studentName parentName parentPhone')
    .lean<{ _id: unknown; studentName: string; parentName: string; parentPhone: string }[]>();
  const byId = new Map(enquiries.map((e) => [String(e._id), e]));

  return followUps.map((f) => {
    const match = byId.get(f.enquiryId);
    // `f` is already a plain lean object at runtime despite being typed as
    // the Document-extending `IFollowUp` (same lean() typing gotcha as
    // everywhere else in this codebase) — safe to spread and re-cast.
    return {
      ...f,
      enquirySummary: match
        ? { studentName: match.studentName, parentName: match.parentName, parentPhone: match.parentPhone }
        : null,
    } as FollowUpWithEnquirySummary;
  });
}
