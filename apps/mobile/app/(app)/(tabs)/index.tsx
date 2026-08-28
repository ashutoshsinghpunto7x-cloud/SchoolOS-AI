import { DashboardScreen } from '@/features/dashboard/screens/DashboardScreen';
import { ParentDashboardScreen } from '@/features/parent-workspace/screens/ParentDashboardScreen';
import { useAuthStore } from '@/stores/authStore';

export default function Dashboard() {
  const role = useAuthStore((s) => s.user?.role);
  return role === 'parent' ? <ParentDashboardScreen /> : <DashboardScreen />;
}
