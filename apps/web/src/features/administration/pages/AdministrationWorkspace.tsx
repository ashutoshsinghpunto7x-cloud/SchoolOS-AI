import { Outlet } from 'react-router-dom';

export const AdministrationWorkspace = () => {
  return (
    <div className="flex flex-col h-full bg-[#FBF8F3]">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};
