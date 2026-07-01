import { NavLink, Outlet } from 'react-router-dom';
import { Users, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Users', path: '/administration/users', icon: Users },
  { label: 'Roles & Permissions', path: '/administration/roles', icon: ShieldCheck },
  { label: 'Automation', path: '/administration/automation', icon: Zap },
] as const;

export const AdministrationWorkspace = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b border-gray-100 bg-white px-8">
        <nav className="flex gap-1" aria-label="Administration sections">
          {TABS.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};
