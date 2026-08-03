import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '../api/maintenanceApi';
import type { ScheduleMaintenanceInput, ToggleMaintenanceInput } from '../api/maintenanceApi';

export const useMaintenanceState = () =>
  useQuery({
    queryKey: ['ops', 'maintenance'],
    queryFn: maintenanceApi.getState,
  });

/** Polled by ProtectedRoute and the public Under Maintenance screen — 20s is
 *  frequent enough to notice maintenance ending without hammering the API. */
export const useMaintenanceStatus = (enabled = true) =>
  useQuery({
    queryKey: ['maintenance', 'status'],
    queryFn: maintenanceApi.getStatus,
    refetchInterval: 20_000,
    enabled,
  });

export const useScheduleMaintenance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleMaintenanceInput) => maintenanceApi.schedule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'status'] });
    },
  });
};

export const useCancelScheduledMaintenance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => maintenanceApi.cancelSchedule(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'status'] });
    },
  });
};

export const useToggleMaintenance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ToggleMaintenanceInput) => maintenanceApi.toggle(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'status'] });
    },
  });
};
