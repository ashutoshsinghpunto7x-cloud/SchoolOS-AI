import { AutomationJob, IAutomationJob, AutomationJobType, AutomationJobStatus } from './automation.model';

// ── Payload types ─────────────────────────────────────────────────────────────

export interface CreateJobPayload {
  type: AutomationJobType;
  provider: IAutomationJob['provider'];
  payload: Record<string, unknown>;
  workflowId?: string;
  referenceId?: string;
  referenceType?: IAutomationJob['referenceType'];
  triggeredBy: string;
  schoolId: string;
}

export interface UpdateJobPayload {
  status?: AutomationJobStatus;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount?: number;
  result?: Record<string, unknown>;
}

export interface FindJobsOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: AutomationJobType;
  status?: AutomationJobStatus;
  workflowId?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WorkflowStats {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  lastExecutedAt?: string;
}

export interface DashboardMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  retryingCount: number;
  avgDurationMs: number;
  executionsByWorkflow: Array<{ workflowId: string; count: number; successCount: number }>;
  recentActivity: Array<{ date: string; count: number; successCount: number }>;
}

export interface PaginatedJobs {
  data: IAutomationJob[];
  meta: { page: number; limit: number; total: number };
}

// ── Repository ────────────────────────────────────────────────────────────────

export const automationRepository = {
  async create(data: CreateJobPayload): Promise<IAutomationJob> {
    return AutomationJob.create(data);
  },

  async findById(id: string, schoolId?: string): Promise<IAutomationJob | null> {
    const filter: Record<string, unknown> = { _id: id };
    if (schoolId) filter.schoolId = schoolId;
    return AutomationJob.findOne(filter).lean<IAutomationJob>();
  },

  async updateById(id: string, data: UpdateJobPayload): Promise<IAutomationJob | null> {
    return AutomationJob.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IAutomationJob>();
  },

  async findAll(schoolId: string, opts: FindJobsOptions = {}): Promise<PaginatedJobs> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;
    const sortDir = opts.sortOrder === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = { schoolId };
    if (opts.type) filter.type = opts.type;
    if (opts.status) filter.status = opts.status;
    if (opts.workflowId) filter.workflowId = opts.workflowId;
    if (opts.search) {
      const escaped = opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { type: { $regex: escaped, $options: 'i' } },
        { triggeredBy: { $regex: escaped, $options: 'i' } },
        { errorMessage: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      AutomationJob.find(filter)
        .sort({ createdAt: sortDir })
        .skip(skip)
        .limit(limit)
        .lean<IAutomationJob[]>(),
      AutomationJob.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
  },

  async getWorkflowStats(workflowId: string, schoolId: string): Promise<WorkflowStats> {
    const [agg] = await AutomationJob.aggregate([
      { $match: { schoolId, workflowId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          failed:  { $sum: { $cond: [{ $eq: ['$status', 'FAILED']    }, 1, 0] } },
          lastExecuted: { $max: '$createdAt' },
          avgMs: {
            $avg: {
              $cond: [
                { $and: [{ $ifNull: ['$completedAt', false] }, { $ifNull: ['$startedAt', false] }] },
                { $subtract: ['$completedAt', '$startedAt'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    if (!agg) return { totalExecutions: 0, successCount: 0, failureCount: 0, avgDurationMs: 0 };
    return {
      totalExecutions: agg.total,
      successCount:    agg.success,
      failureCount:    agg.failed,
      avgDurationMs:   Math.round(agg.avgMs ?? 0),
      lastExecutedAt:  agg.lastExecuted?.toISOString(),
    };
  },

  async getDashboardMetrics(schoolId: string): Promise<DashboardMetrics> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [summary, byWorkflow, byDay] = await Promise.all([
      AutomationJob.aggregate([
        { $match: { schoolId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgMs: {
              $avg: {
                $cond: [
                  { $and: [{ $ifNull: ['$completedAt', false] }, { $ifNull: ['$startedAt', false] }] },
                  { $subtract: ['$completedAt', '$startedAt'] },
                  null,
                ],
              },
            },
          },
        },
      ]),
      AutomationJob.aggregate([
        { $match: { schoolId, workflowId: { $exists: true } } },
        {
          $group: {
            _id: '$workflowId',
            count:   { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          },
        },
      ]),
      AutomationJob.aggregate([
        { $match: { schoolId, createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count:   { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const statusMap = Object.fromEntries(summary.map((s: { _id: string; count: number; avgMs: number | null }) => [s._id, s]));
    const total = summary.reduce((n: number, s: { count: number }) => n + s.count, 0);
    const allAvgMs = summary.reduce((acc: number, s: { count: number; avgMs: number | null }) => acc + (s.avgMs ?? 0) * s.count, 0);

    return {
      totalExecutions: total,
      successCount:    statusMap['COMPLETED']?.count ?? 0,
      failureCount:    statusMap['FAILED']?.count ?? 0,
      runningCount:    statusMap['RUNNING']?.count ?? 0,
      retryingCount:   statusMap['RETRYING']?.count ?? 0,
      avgDurationMs:   total > 0 ? Math.round(allAvgMs / total) : 0,
      executionsByWorkflow: byWorkflow.map((b: { _id: string; count: number; success: number }) => ({
        workflowId: b._id, count: b.count, successCount: b.success,
      })),
      recentActivity: byDay.map((d: { _id: string; count: number; success: number }) => ({
        date: d._id, count: d.count, successCount: d.success,
      })),
    };
  },
};
