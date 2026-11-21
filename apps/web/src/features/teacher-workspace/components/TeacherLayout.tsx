import { Outlet } from 'react-router-dom';
import { useBuddyTip } from '@/features/companion/useBuddyTip';

export function TeacherLayout() {
  useBuddyTip();
  return (
    <div className="flex-1 w-full bg-[#FBF8F3]">
      <Outlet />
    </div>
  );
}
