import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardList, User } from 'lucide-react';

const NAV = [
  { to: '/teacher',         icon: LayoutDashboard, label: 'Home',    end: true  },
  { to: '/teacher/classes', icon: BookOpen,         label: 'Classes', end: false },
  { to: '/teacher/history', icon: ClipboardList,    label: 'History', end: false },
  { to: '/teacher/profile', icon: User,             label: 'Profile', end: false },
];

export function TeacherLayout() {
  return (
    <>
      <div className="pb-20 lg:pb-0">
        <Outlet />
      </div>

      {/* Mobile-only bottom navigation */}
      <nav
        aria-label="Teacher navigation"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className="flex-1">
              {({ isActive }) => (
                <div
                  className={`flex flex-col items-center gap-0.5 py-1.5 transition-all duration-200 ${
                    isActive ? 'text-[#0B3D2E]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div
                    className={`w-11 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive ? 'bg-[#10B981]/10' : ''
                    }`}
                  >
                    <Icon
                      className="w-[19px] h-[19px]"
                      strokeWidth={isActive ? 2.5 : 1.75}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
