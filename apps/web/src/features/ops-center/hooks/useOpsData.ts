import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi } from '../api/opsApi';
import type { OpsLogsParams, OpsAuditTrailParams, AlertStatus } from '../api/opsApi';

const POLL_INTERVAL_MS = 10_000;
const LOGS_POLL_INTERVAL_MS = 5_000;

export const useOpsDashboard = () =>
  useQuery({
    queryKey: ['ops', 'dashboard'],
    queryFn: opsApi.getDashboard,
    refetchInterval: POLL_INTERVAL_MS,
  });

export const useOpsSchools = () =>
  useQuery({
    queryKey: ['ops', 'schools'],
    queryFn: opsApi.getSchools,
    refetchInterval: POLL_INTERVAL_MS,
  });

export const useOpsInfrastructure = () =>
  useQuery({
    queryKey: ['ops', 'infrastructure'],
    queryFn: opsApi.getInfrastructure,
    refetchInterval: POLL_INTERVAL_MS,
  });

export const useOpsSecurity = () =>
  useQuery({
    queryKey: ['ops', 'security'],
    queryFn: opsApi.getSecurity,
    refetchInterval: POLL_INTERVAL_MS,
  });

export const useOpsLogs = (params: OpsLogsParams, live: boolean) =>
  useQuery({
    queryKey: ['ops', 'logs', params],
    queryFn: () => opsApi.getLogs(params),
    refetchInterval: live ? LOGS_POLL_INTERVAL_MS : false,
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
  });

export const useOpsSchoolDetail = (schoolId: string) =>
  useQuery({
    queryKey: ['ops', 'schools', schoolId],
    queryFn: () => opsApi.getSchoolDetail(schoolId),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: !!schoolId,
  });

export const useOpsErrors = () =>
  useQuery({
    queryKey: ['ops', 'errors'],
    queryFn: opsApi.getErrors,
    refetchInterval: POLL_INTERVAL_MS,
  });

export const useOpsDatabase = () =>
  useQuery({
    queryKey: ['ops', 'database'],
    queryFn: opsApi.getDatabase,
    refetchInterval: POLL_INTERVAL_MS,
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
