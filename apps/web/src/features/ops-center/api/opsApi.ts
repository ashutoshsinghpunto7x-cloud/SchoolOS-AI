import { apiClient } from '@/services/api';

export interface OpsAuditLogEntry {
  _id: string;
  userId: string;
  userDisplayName: string;
  action: string;
  resource: string;
  resourceId: string;
  schoolId: string;
  ip?: string;
  createdAt: string;
}

export interface OpsMetricsSnapshot {
  requestsPerMinute: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
}

export interface OpsInfrastructure extends OpsMetricsSnapshot {
  uptimeSeconds: number;
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
  };
  loadAverage: number[];
  cpuCount: number;
  database: {
    status: string;
    healthy: boolean;
  };
}

export interface OpsDashboardTotals {
  studentTotal: number;
  teacherTotal: number;
  schoolCount: number;
  internalActiveUsers: number;
}

export interface OpsDashboard {
  totals: OpsDashboardTotals;
  infrastructure: OpsInfrastructure;
  recentActivity: OpsAuditLogEntry[];
}

export type SecurityEventType = 'failed_login' | 'invalid_token' | 'permission_denied' | 'rate_limited';
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface OpsSecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  ip?: string;
  path?: string;
  userId?: string;
  role?: string;
  schoolId?: string;
  createdAt: string;
}

export interface OpsSecuritySummary {
  failedLogins: number;
  invalidTokens: number;
  permissionViolations: number;
  rateLimited: number;
}

export interface OpsSecurity {
  summary: OpsSecuritySummary;
  events: OpsSecurityEvent[];
}

export interface OpsLogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface OpsLogsParams {
  level?: string;
  search?: string;
  limit?: number;
}

export interface OpsFeatureHealth {
  feature: string;
  requests: number;
  errors: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
  lastSeenAt: string;
}

export interface OpsAuditTrailParams {
  schoolId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface OpsSchoolRow {
  schoolId: string;
  schoolName: string;
  studentCount: number;
  teacherCount: number;
  activeUsers15m: number;
  attendanceRatePercent: number;
  feeCollectedTodayRupees: number;
  lastActivityAt: string | null;
}

export interface OpsDayTrend {
  date: string;
  attendanceRatePercent: number;
  feeCollectedRupees: number;
}

export interface OpsSchoolDetail extends OpsSchoolRow {
  trend: OpsDayTrend[];
  recentActivity: OpsAuditLogEntry[];
  recentSecurityEvents: OpsSecurityEvent[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const opsApi = {
  async getDashboard(): Promise<OpsDashboard> {
    const res = await apiClient.get<ApiEnvelope<OpsDashboard>>('/ops/dashboard');
    return res.data.data;
  },

  async getSchools(): Promise<OpsSchoolRow[]> {
    const res = await apiClient.get<ApiEnvelope<OpsSchoolRow[]>>('/ops/schools');
    return res.data.data;
  },

  async getInfrastructure(): Promise<OpsInfrastructure> {
    const res = await apiClient.get<ApiEnvelope<OpsInfrastructure>>('/ops/infrastructure');
    return res.data.data;
  },

  async getSecurity(): Promise<OpsSecurity> {
    const res = await apiClient.get<ApiEnvelope<OpsSecurity>>('/ops/security');
    return res.data.data;
  },

  async getLogs(params: OpsLogsParams): Promise<OpsLogEntry[]> {
    const res = await apiClient.get<ApiEnvelope<OpsLogEntry[]>>('/ops/logs', { params });
    return res.data.data;
  },

  async getAuditTrail(params: OpsAuditTrailParams): Promise<PaginatedResult<OpsAuditLogEntry>> {
    const res = await apiClient.get<PaginatedResult<OpsAuditLogEntry>>('/ops/audit-trail', { params });
    return res.data;
  },

  async getApplications(): Promise<OpsFeatureHealth[]> {
    const res = await apiClient.get<ApiEnvelope<OpsFeatureHealth[]>>('/ops/applications');
    return res.data.data;
  },

  async getSchoolDetail(schoolId: string): Promise<OpsSchoolDetail> {
    const res = await apiClient.get<ApiEnvelope<OpsSchoolDetail>>(`/ops/schools/${schoolId}`);
    return res.data.data;
  },
};
