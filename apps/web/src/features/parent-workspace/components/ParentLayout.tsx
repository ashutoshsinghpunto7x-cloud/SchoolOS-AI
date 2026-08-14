import { Outlet } from 'react-router-dom';
import { ParentBottomNav } from './ParentBottomNav';

export function ParentLayout() {
  return (
    <div className="min-h-screen bg-[#F5F1EB]">
      <div className="pb-20 lg:pb-0">
        <Outlet />
      </div>
      <ParentBottomNav />
    </div>
  );
}
