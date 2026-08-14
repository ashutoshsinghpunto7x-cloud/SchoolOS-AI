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

export type ErrorEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface OpsErrorEvent {
  id: string;
  severity: ErrorEventSeverity;
  statusCode: number;
  code: string;
  message: string;
  path?: string;
  method?: string;
  userId?: string;
  role?: string;
  schoolId?: string;
  stack?: string;
  createdAt: string;
}

export interface OpsErrorSummary {
  total: number;
  serverErrors: number;
  validationErrors: number;
  notFoundErrors: number;
  conflictErrors: number;
}

export interface OpsErrors {
  summary: OpsErrorSummary;
  events: OpsErrorEvent[];
}

export interface OpsFeatureHealth {
  feature: string;
  requests: number;
  errors: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs?: number;
  p99ResponseTimeMs?: number;
  statusCodes?: Record<string, number>;
  lastSeenAt: string;
}

export type RootCauseCategory =
  | 'database' | 'authentication' | 'authorization' | 'validation' | 'frontend'
  | 'network' | 'rate_limiting' | 'mongodb' | 'jwt' | 'external_api' | 'n8n'
  | 'memory_leak' | 'race_condition' | 'unknown';

export interface OpsLastError {
  statusCode: number;
  code: string;
  message: string;
  category: RootCauseCategory;
  confidencePercent: number;
  probableCause: string;
  recommendedFix: string;
  affectedRole: string | null;
  lastSeenAt: string;
}

export interface OpsErrorModuleBreakdown extends OpsFeatureHealth {
  successCount: number;
  lastError: OpsLastError | null;
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

export interface OpsDatabaseStats {
  connected: boolean;
  version: string | null;
  uptimeSeconds: number | null;
  connections: { current: number; available: number; totalCreated: number } | null;
  opcounters: Record<string, number> | null;
  network: { bytesIn: number; bytesOut: number; numRequests: number } | null;
  storage: {
    dataSizeBytes: number;
    storageSizeBytes: number;
    indexSizeBytes: number;
    collectionCount: number;
    indexCount: number;
  } | null;
  topCollections: {
    name: string;
    count: number;
    storageSizeBytes: number;
    totalIndexSizeBytes: number;
    avgObjSizeBytes: number;
  }[];
  profiler: { available: boolean; reason?: string };
}

export interface OpsDeploy {
  id: string;
  status: string;
  trigger: string;
  commitId?: string;
  commitMessage?: string;
  commitCreatedAt?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface OpsDeployments {
  available: boolean;
  reason?: string;
  deploys: OpsDeploy[];
}

export interface OpsWhatsAppMessage {
  _id: string;
  status: string;
  provider: string;
  title: string;
  schoolId: string;
  createdAt: string;
}

export interface OpsCommunications {
  whatsapp: {
    last30dByStatus: Record<string, number>;
    recent: OpsWhatsAppMessage[];
  };
  pushNotifications: {
    last30dSent: number;
    last30dRead: number;
    readRatePercent: number;
    note: string;
  };
}

export interface OpsUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  schoolId: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface OpsRoleMeta {
  role: string;
  label: string;
  description: string;
}

export interface OpsPermissionMeta {
  key: string;
  label: string;
  category: string;
}

export interface OpsUsersScreen {
  users: OpsUser[];
  roles: OpsRoleMeta[];
  permissions: OpsPermissionMeta[];
  matrix: Record<string, readonly string[]>;
}

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type AlertSeverity = 'critical' | 'warning';

export interface OpsAlert {
  alertKey: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  schoolId?: string;
  status: AlertStatus;
  assignedToName: string | null;
  note: string | null;
  updatedAt: string | null;
}

export interface OpsSettings {
  environment: string;
  frontendUrl: string;
  nodeVersion: string;
  rateLimiting: { windowMs: number; maxRequests: number };
  authTokens: { accessTokenExpiresIn: string; refreshTokenExpiresIn: string };
  integrations: {
    openai: boolean;
    twilioWhatsapp: boolean;
    firebasePush: boolean;
    renderDeployments: boolean;
  };
}

export type PerformanceTestStatus = 'running' | 'completed' | 'stopped' | 'failed';
export type PerformanceTestStage = 'ramp-up' | 'steady' | 'ramp-down' | 'completed';

export interface PerformanceTestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSec: number;
  avgResponseMs: number;
  medianResponseMs: number;
  p90ResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
  maxResponseMs: number;
  successRatePercent: number;
  errorRatePercent: number;
  http429Count: number;
  http500Count: number;
  http401Count: number;
  authFailures: number;
  duplicateAttendanceRatePercent: number;
  raceConditionRatePercent: number;
  teacherWorkflowSuccessRatePercent: number;
  peakVUs: number;
}

export interface PerformanceTestRun {
  runId: string;
  label: string;
  scriptName: string;
  targetVUs: number;
  durationMinutes: number;
  status: PerformanceTestStatus;
  stage: PerformanceTestStage;
  startedAt: string;
  endedAt?: string;
  startedByUserId: string;
  startedByName: string;
  summary?: PerformanceTestSummary;
  failureReason?: string;
}

export interface PerformanceTestAlert {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  occurredAt: string;
}

export interface PerformanceTestActivity {
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
}

export interface PerformanceTestLiveSnapshot {
  runId: string;
  label: string;
  status: PerformanceTestStatus;
  stage: PerformanceTestStage;
  targetVUs: number;
  durationMinutes: number;
  currentVUs: number;
  peakVUs: number;
  startedAt: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSec: number;
  avgResponseMs: number;
  medianResponseMs: number;
  p90ResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
  maxResponseMs: number;
  successRatePercent: number;
  errorRatePercent: number;
  http429Count: number;
  http500Count: number;
  http401Count: number;
  authFailures: number;
  duplicateAttendanceRatePercent: number;
  raceConditionRatePercent: number;
  teacherWorkflowSuccessRatePercent: number;
  statusCodeCounts: Record<string, number>;
  topEndpoints: Array<{ name: string; requests: number; avgMs: number }>;
  series: {
    timestamps: string[];
    avgResponseMs: number[];
    p95ResponseMs: number[];
    p99ResponseMs: number[];
    requestsPerSec: number[];
    virtualUsers: number[];
    errorRatePercent: number[];
  };
  infra: {
    cpuPercent: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
    eventLoopDelayMs: number;
    mongoLatencyMs: number;
    mongoHealthy: boolean;
    mongoPoolSize: number;
  };
  alerts: PerformanceTestAlert[];
  activity: PerformanceTestActivity[];
}

export interface StartPerformanceTestInput {
  vus: number;
  durationMinutes: number;
  label?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── Chapter Capture usage analytics ──────────────────────────────────────────

export interface OpsChapterCaptureOverview {
  totalUsers: number;
  totalDocuments: number;
  totalPages: number;
  totalWords: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgProcessingTimeMs: number;
  avgWordsPerDocument: number;
}

export interface OpsChapterCaptureUserUsage {
  userId: string;
  documents: number;
  pages: number;
  wordsGenerated: number;
  processingRequests: number;
}

export interface OpsChapterCaptureUsage {
  overview: OpsChapterCaptureOverview;
  byUser: OpsChapterCaptureUserUsage[];
}

export interface OpsChapterCaptureUsageParams {
  schoolId?: string;
  userId?: string;
  from?: string;
  to?: string;
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

  async getChapterCaptureUsage(params: OpsChapterCaptureUsageParams): Promise<OpsChapterCaptureUsage> {
    const res = await apiClient.get<ApiEnvelope<OpsChapterCaptureUsage>>('/ops/chapter-capture-usage', { params });
    return res.data.data;
  },

  async getSchoolDetail(schoolId: string): Promise<OpsSchoolDetail> {
    const res = await apiClient.get<ApiEnvelope<OpsSchoolDetail>>(`/ops/schools/${schoolId}`);
    return res.data.data;
  },

  async getErrors(): Promise<OpsErrors> {
    const res = await apiClient.get<ApiEnvelope<OpsErrors>>('/ops/errors');
    return res.data.data;
  },

  async getErrorsByModule(): Promise<OpsErrorModuleBreakdown[]> {
    const res = await apiClient.get<ApiEnvelope<OpsErrorModuleBreakdown[]>>('/ops/errors/by-module');
    return res.data.data;
  },

  async getDatabase(): Promise<OpsDatabaseStats> {
    const res = await apiClient.get<ApiEnvelope<OpsDatabaseStats>>('/ops/database');
    return res.data.data;
  },

  async getDeployments(): Promise<OpsDeployments> {
    const res = await apiClient.get<ApiEnvelope<OpsDeployments>>('/ops/deployments');
    return res.data.data;
  },

  async getCommunications(): Promise<OpsCommunications> {
    const res = await apiClient.get<ApiEnvelope<OpsCommunications>>('/ops/communications');
    return res.data.data;
  },

  async getUsersScreen(): Promise<OpsUsersScreen> {
    const res = await apiClient.get<ApiEnvelope<OpsUsersScreen>>('/ops/users');
    return res.data.data;
  },

  async getAlerts(): Promise<OpsAlert[]> {
    const res = await apiClient.get<ApiEnvelope<OpsAlert[]>>('/ops/alerts');
    return res.data.data;
  },

  async updateAlert(
    alertKey: string,
    updates: { status?: AlertStatus; assignedToUserId?: string; assignedToName?: string; note?: string },
  ): Promise<void> {
    await apiClient.patch(`/ops/alerts/${encodeURIComponent(alertKey)}`, updates);
  },

  async getSettings(): Promise<OpsSettings> {
    const res = await apiClient.get<ApiEnvelope<OpsSettings>>('/ops/settings');
    return res.data.data;
  },

  async startPerformanceTest(input: StartPerformanceTestInput): Promise<{ runId: string; label: string }> {
    const res = await apiClient.post<ApiEnvelope<{ runId: string; label: string }>>('/performance-tests/start', input);
    return res.data.data;
  },

  async stopPerformanceTest(runId: string): Promise<void> {
    await apiClient.post(`/performance-tests/${runId}/stop`);
  },

  async getPerformanceTestLive(): Promise<PerformanceTestLiveSnapshot | null> {
    const res = await apiClient.get<ApiEnvelope<PerformanceTestLiveSnapshot | null>>('/performance-tests/live');
    return res.data.data;
  },

  async getPerformanceTestHistory(params: { page?: number; limit?: number }): Promise<PaginatedResult<PerformanceTestRun>> {
    const res = await apiClient.get<PaginatedResult<PerformanceTestRun>>('/performance-tests', { params });
    return res.data;
  },

  async getPerformanceTestDetail(runId: string): Promise<PerformanceTestRun> {
    const res = await apiClient.get<ApiEnvelope<PerformanceTestRun>>(`/performance-tests/${runId}`);
    return res.data.data;
  },

  async downloadPerformanceTestReport(runId: string, format: 'json' | 'csv'): Promise<Blob> {
    const res = await apiClient.get(`/performance-tests/${runId}/report.${format}`, { responseType: 'blob' });
    return res.data as Blob;
  },
};
