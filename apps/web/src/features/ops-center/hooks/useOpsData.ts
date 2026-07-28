import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi } from '../api/opsApi';
import type { OpsLogsParams, OpsAuditTrailParams, AlertStatus } from '../api/opsApi';

// Was 10s/5s — with ~9 independently-polling hooks on this dashboard, a single
// admin tab left open generated 70+ req/min. Ops Center doesn't need
// sub-10s freshness for most panels, so doubling both intervals roughly
// halves that load with no meaningful loss of "live" feel.
const POLL_INTERVAL_MS = 20_000;
const LOGS_POLL_INTERVAL_MS = 10_000;

export const useOpsDashboard = () =>
  useQuery({
    queryKey: ['ops', 'dashboard'],
    queryFn: opsApi.getDashboard,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsSchools = () =>
  useQuery({
    queryKey: ['ops', 'schools'],
    queryFn: opsApi.getSchools,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsInfrastructure = () =>
  useQuery({
    queryKey: ['ops', 'infrastructure'],
    queryFn: opsApi.getInfrastructure,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsSecurity = () =>
  useQuery({
    queryKey: ['ops', 'security'],
    queryFn: opsApi.getSecurity,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsLogs = (params: OpsLogsParams, live: boolean) =>
  useQuery({
    queryKey: ['ops', 'logs', params],
    queryFn: () => opsApi.getLogs(params),
    refetchInterval: live ? LOGS_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
  });

export const useOpsAuditTrail = (params: OpsAuditTrailParams) =>
  useQuery({
    queryKey: ['ops', 'audit-trail', params],
    queryFn: () => opsApi.getAuditTrail(params),
  });

export const useOpsApplications = () =>
  useQuery({
    queryKey: ['ops', 'applications'],
    queryFn: opsApi.getApplications,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsSchoolDetail = (schoolId: string) =>
  useQuery({
    queryKey: ['ops', 'schools', schoolId],
    queryFn: () => opsApi.getSchoolDetail(schoolId),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
    enabled: !!schoolId,
  });

export const useOpsErrors = () =>
  useQuery({
    queryKey: ['ops', 'errors'],
    queryFn: opsApi.getErrors,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsErrorsByModule = () =>
  useQuery({
    queryKey: ['ops', 'errors', 'by-module'],
    queryFn: opsApi.getErrorsByModule,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsDatabase = () =>
  useQuery({
    queryKey: ['ops', 'database'],
    queryFn: opsApi.getDatabase,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsDeployments = () =>
  useQuery({
    queryKey: ['ops', 'deployments'],
    queryFn: opsApi.getDeployments,
  });

export const useOpsCommunications = () =>
  useQuery({
    queryKey: ['ops', 'communications'],
    queryFn: opsApi.getCommunications,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useOpsUsersScreen = () =>
  useQuery({
    queryKey: ['ops', 'users'],
    queryFn: opsApi.getUsersScreen,
  });

export const useOpsAlerts = () =>
  useQuery({
    queryKey: ['ops', 'alerts'],
    queryFn: opsApi.getAlerts,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

export const useUpdateOpsAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertKey, status }: { alertKey: string; status: AlertStatus }) =>
      opsApi.updateAlert(alertKey, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'alerts'] }),
  });
};

export const useOpsSettings = () =>
  useQuery({
    queryKey: ['ops', 'settings'],
    queryFn: opsApi.getSettings,
  });

const LIVE_TEST_POLL_MS = 1000;
const IDLE_LIVE_TEST_POLL_MS = 5000;

// Polls at 1s while a test is actively running (so the dashboard truly
// updates every second), and falls back to a slower 5s poll while idle so a
// test started from another tab/operator is still picked up without the
// operator needing to manually refresh.
export const useOpsPerformanceLive = () =>
  useQuery({
    queryKey: ['ops', 'performance', 'live'],
    queryFn: opsApi.getPerformanceTestLive,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? LIVE_TEST_POLL_MS : IDLE_LIVE_TEST_POLL_MS),
    refetchOnWindowFocus: false,
  });

export const useOpsPerformanceHistory = (params: { page?: number; limit?: number } = {}) =>
  useQuery({
    queryKey: ['ops', 'performance', 'history', params],
    queryFn: () => opsApi.getPerformanceTestHistory(params),
  });

export const useOpsPerformanceDetail = (runId: string | undefined) =>
  useQuery({
    queryKey: ['ops', 'performance', 'run', runId],
    queryFn: () => opsApi.getPerformanceTestDetail(runId as string),
    enabled: !!runId,
  });

export const useStartPerformanceTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: opsApi.startPerformanceTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'performance', 'live'] });
      queryClient.invalidateQueries({ queryKey: ['ops', 'performance', 'history'] });
    },
  });
};

export const useStopPerformanceTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: opsApi.stopPerformanceTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'performance', 'live'] });
      queryClient.invalidateQueries({ queryKey: ['ops', 'performance', 'history'] });
    },
  });
};
