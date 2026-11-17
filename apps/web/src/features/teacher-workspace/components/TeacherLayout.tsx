import { Outlet } from 'react-router-dom';

export function TeacherLayout() {
  return (
    <div className="flex-1 w-full bg-[#FBF8F3]">
      <Outlet />
    </div>
  );
}
