import { AttendanceListScreen } from '@/features/attendance/screens/AttendanceListScreen';
import { ParentAttendanceScreen } from '@/features/parent-workspace/screens/ParentAttendanceScreen';
import { useAuthStore } from '@/stores/authStore';

export default function AttendanceIndex() {
  const role = useAuthStore((s) => s.user?.role);
  return role === 'parent' ? <ParentAttendanceScreen /> : <AttendanceListScreen />;
}
