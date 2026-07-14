import { AuditLog, IAuditLog } from './audit.model';

export interface FindAuditOptions {
  resource?: string;
  resourceId?: string;
  page?: number;
  limit?: number;
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
};
