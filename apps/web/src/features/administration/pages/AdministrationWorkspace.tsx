import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, Zap, GraduationCap, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Dashboard', path: '/administration', icon: LayoutDashboard, end: true },
  { label: 'Users', path: '/administration/users', icon: Users, end: false },
  { label: 'Roles & Permissions', path: '/administration/roles', icon: ShieldCheck, end: false },
  { label: 'Classes', path: '/administration/classes', icon: GraduationCap, end: false },
  { label: 'Automation', path: '/administration/automation', icon: Zap, end: false },
  { label: 'Recovery Requests', path: '/administration/recovery-requests', icon: KeyRound, end: false },
] as const;

export const AdministrationWorkspace = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b border-gray-100 bg-white px-8">
        <nav className="flex gap-1" aria-label="Administration sections">
          {TABS.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-colors',
                  isActive
                    ? 'border-[var(--brand-purple-dark)] text-[var(--brand-purple-dark)]'
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
