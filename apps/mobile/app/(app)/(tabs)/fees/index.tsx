import { FeesOverviewScreen } from '@/features/fees/screens/FeesOverviewScreen';
import { ParentFeesScreen } from '@/features/parent-workspace/screens/ParentFeesScreen';
import { useAuthStore } from '@/stores/authStore';

export default function FeesIndex() {
  const role = useAuthStore((s) => s.user?.role);
  return role === 'parent' ? <ParentFeesScreen /> : <FeesOverviewScreen />;
}
