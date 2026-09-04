import { FacilityRequest, IFacilityRequest, FacilityIssueType, FacilityRequestStatus } from './facility-request.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindFacilityRequestsOptions {
  page?: number;
  limit?: number;
  status?: FacilityRequestStatus;
  issueType?: FacilityIssueType;
  raisedBy?: string;
}

export interface PaginatedFacilityRequests {
  records: IFacilityRequest[];
  total: number;
  page: number;
  limit: number;
}

const OPEN_STATUSES: FacilityRequestStatus[] = ['open', 'assigned', 'in_progress'];

// ── Repository ────────────────────────────────────────────────────────────────

export const facilityRequestRepository = {
  async create(data: Partial<IFacilityRequest>): Promise<IFacilityRequest> {
    const request = new FacilityRequest(data);
    return request.save();
  },

  async findById(id: string, schoolId: string): Promise<IFacilityRequest | null> {
    return FacilityRequest.findOne({ _id: id, schoolId, isDeleted: false }).lean<IFacilityRequest>();
  },

  async findAll(schoolId: string, opts: FindFacilityRequestsOptions = {}): Promise<PaginatedFacilityRequests> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.status)    query.status = opts.status;
    if (opts.issueType) query.issueType = opts.issueType;
    if (opts.raisedBy)  query.raisedBy = opts.raisedBy;

    const [records, total] = await Promise.all([
      FacilityRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IFacilityRequest[]>(),
      FacilityRequest.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async countOpen(schoolId: string): Promise<number> {
    return FacilityRequest.countDocuments({ schoolId, isDeleted: false, status: { $in: OPEN_STATUSES } });
  },

  /** Open/assigned/in-progress tickets against one asset — drives whether
   *  that Asset's status should read 'under_repair' (see asset-status sync
   *  in facility-request.service.ts). */
  async countOpenByAsset(schoolId: string, assetId: string): Promise<number> {
    return FacilityRequest.countDocuments({ schoolId, isDeleted: false, assetId, status: { $in: OPEN_STATUSES } });
  },

  async update(id: string, schoolId: string, data: Partial<IFacilityRequest>): Promise<IFacilityRequest | null> {
    return FacilityRequest.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IFacilityRequest>();
  },

  /** Average minutes between creation and resolution, over completed tickets only. */
  async averageResolutionMinutes(schoolId: string): Promise<number> {
    const agg = await FacilityRequest.aggregate<{ avgMs: number }>([
      { $match: { schoolId, isDeleted: false, status: 'completed', resolvedAt: { $exists: true } } },
      { $project: { diffMs: { $subtract: ['$resolvedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$diffMs' } } },
    ]);
    const avgMs = agg[0]?.avgMs ?? 0;
    return Math.round(avgMs / 60000);
  },
};
