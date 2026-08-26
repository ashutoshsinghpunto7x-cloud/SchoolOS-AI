import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transportApi } from '../api/transport.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const transportKeys = {
  all: ['transport'] as const,
  myVehicle: () => [...transportKeys.all, 'my-vehicle'] as const,
  parentLive: (childId?: string) => [...transportKeys.all, 'parent-live', childId ?? null] as const,
  vehicles: () => [...transportKeys.all, 'vehicles'] as const,
  vehicleStudents: (vehicleId: string) => [...transportKeys.all, 'vehicle-students', vehicleId] as const,
  live: () => [...transportKeys.all, 'live'] as const,
};

// ── Driver ───────────────────────────────────────────────────────────────────

export const useMyVehicle = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: transportKeys.myVehicle(),
    queryFn: transportApi.getMyVehicle,
    enabled: isAuthenticated,
  });
};

export const useStartRoute = () => useMutation({
  mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
    transportApi.startRoute(latitude, longitude),
});

export const usePing = () => useMutation({
  mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
    transportApi.ping(latitude, longitude),
});

export const useEndRoute = () => useMutation({
  mutationFn: () => transportApi.endRoute(),
});

// ── Parent ───────────────────────────────────────────────────────────────────
// Polled every 12s, matching the existing refetchInterval convention used
// elsewhere (e.g. useNotifications.ts) rather than WebSockets/Supabase Realtime.
const PARENT_POLL_INTERVAL_MS = 12_000;

export const useParentLiveLocation = (childId?: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: transportKeys.parentLive(childId),
    queryFn: () => transportApi.getParentLive(childId),
    enabled: isAuthenticated,
    refetchInterval: PARENT_POLL_INTERVAL_MS,
    staleTime: PARENT_POLL_INTERVAL_MS,
  });
};

// ── Admin / Principal ────────────────────────────────────────────────────────

export const useVehicles = () => useQuery({
  queryKey: transportKeys.vehicles(),
  queryFn: transportApi.listVehicles,
});

export const useDrivers = () => useQuery({
  queryKey: [...transportKeys.all, 'drivers'] as const,
  queryFn: transportApi.listDrivers,
});

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleNumber, routeName }: { vehicleNumber: string; routeName: string }) =>
      transportApi.createVehicle(vehicleNumber, routeName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() }),
  });
};

export const useAssignDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, driverUserId }: { vehicleId: string; driverUserId: string }) =>
      transportApi.assignDriver(vehicleId, driverUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() }),
  });
};

export const useAssignStudents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, studentIds }: { vehicleId: string; studentIds: string[] }) =>
      transportApi.assignStudents(vehicleId, studentIds),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicleStudents(variables.vehicleId) }),
  });
};

export const useVehicleStudents = (vehicleId: string | null) => useQuery({
  queryKey: transportKeys.vehicleStudents(vehicleId ?? ''),
  queryFn: () => transportApi.listVehicleStudents(vehicleId!),
  enabled: Boolean(vehicleId),
});

// Overview map for admin/principal — 15s poll, same rationale as the parent view.
const LIVE_POLL_INTERVAL_MS = 15_000;

export const useAllLiveVehicles = () => useQuery({
  queryKey: transportKeys.live(),
  queryFn: transportApi.listAllLive,
  refetchInterval: LIVE_POLL_INTERVAL_MS,
  staleTime: LIVE_POLL_INTERVAL_MS,
});
