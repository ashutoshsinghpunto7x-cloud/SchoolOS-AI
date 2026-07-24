import { AuditLog, IAuditLog } from './audit.model';

export interface FindAuditOptions {
  resource?: string;
  resourceId?: string;
  page?: number;
  limit?: number;
}

export interface FindAuditAcrossSchoolsOptions extends FindAuditOptions {
  schoolId?: string;
  userId?: string;
  action?: string;
  /** Inclusive lower bound on createdAt, ISO string. */
  dateFrom?: string;
  /** Inclusive upper bound on createdAt, ISO string. */
  dateTo?: string;
}

export interface PaginatedAuditLogs {
  logs: IAuditLog[];
  total: number;
  page: number;
  limit: number;
}

export const auditRepository = {
  /** Read-side of the audit log — used for "what changed / when" views
   * (Salary, Teacher deletions) that need to show history back to the user. */
  async findAll(schoolId: string, opts: FindAuditOptions = {}): Promise<PaginatedAuditLogs> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId };
    if (opts.resource)   query.resource   = opts.resource;
    if (opts.resourceId) query.resourceId = opts.resourceId;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IAuditLog[]>(),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total, page, limit };
  },

  /** Ops Center only — intentionally omits the schoolId filter to show a
   * platform-wide activity feed. Never expose this via a tenant-facing route;
   * callers must already be gated to internal staff roles. */
  async findAllAcrossSchools(opts: FindAuditAcrossSchoolsOptions = {}): Promise<PaginatedAuditLogs> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (opts.resource)   query.resource   = opts.resource;
    if (opts.resourceId) query.resourceId = opts.resourceId;
    if (opts.schoolId)   query.schoolId   = opts.schoolId;
    if (opts.userId)     query.userId     = opts.userId;
    if (opts.action)     query.action     = opts.action;
    if (opts.dateFrom || opts.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (opts.dateFrom) createdAt.$gte = new Date(opts.dateFrom);
      if (opts.dateTo)   createdAt.$lte = new Date(opts.dateTo);
      query.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IAuditLog[]>(),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total, page, limit };
  },
};
