import { useQuery } from '@tanstack/react-query';
import { adminOverviewApi } from '../api/admin-overview.api';
import type { AdminOverviewData } from '@schoolos/types';

export const adminOverviewKey = ['admin-overview'] as const;

export const useAdminOverview = () =>
  useQuery<AdminOverviewData, Error>({
    queryKey: adminOverviewKey,
    queryFn: () => adminOverviewApi.get(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
