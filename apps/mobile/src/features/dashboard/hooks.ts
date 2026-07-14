import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { dashboardApi } from './api';

export function useAccountantDashboard() {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({
    queryKey: ['dashboard', 'accountant'],
    queryFn: dashboardApi.getAccountantDashboard,
    enabled: role === 'accountant',
  });
}
