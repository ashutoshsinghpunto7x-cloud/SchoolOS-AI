import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardList, LayoutGrid, Mail } from 'lucide-react';

const NAV = [
  { to: '/teacher',           icon: LayoutDashboard, label: 'Home',      end: true  },
  { to: '/teacher/classes',   icon: BookOpen,         label: 'Classes',  end: false },
  { to: '/teacher/history',   icon: ClipboardList,    label: 'History',  end: false },
  { to: '/teacher/timetable', icon: LayoutGrid,       label: 'Timetable', end: false },
  { to: '/messages',          icon: Mail,             label: 'Messages', end: false },
];

export function TeacherLayout() {
  return (
    <>
      <div className="pb-20">
        <Outlet />
      </div>

      {/* Bottom navigation — the teacher portal has no sidebar, so this is
          the only nav and stays visible on every breakpoint. */}
      <nav
        aria-label="Teacher navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0F0821]/95 backdrop-blur-sm border-t border-gray-100 dark:border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16 max-w-xl mx-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className="flex-1">
              {({ isActive }) => (
                <div
                  className={`flex flex-col items-center gap-0.5 py-1.5 transition-all duration-200 ${
                    isActive ? 'text-[#5B21B6] dark:text-violet-300' : 'text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70'
                  }`}
                >
                  <div
                    className={`w-11 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive ? 'bg-[#A855F7]/10 dark:bg-[#A855F7]/20' : ''
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
