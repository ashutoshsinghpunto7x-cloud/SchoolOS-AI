import { NavLink } from 'react-router-dom';
import { Home, BookOpen, CalendarCheck, Wallet, MoreHorizontal } from 'lucide-react';

const NAV = [
  { to: '/parent', icon: Home, label: 'Home', end: true },
  { to: '/parent/academics', icon: BookOpen, label: 'Academics', end: false },
  { to: '/parent/attendance', icon: CalendarCheck, label: 'Attendance', end: false },
  { to: '/parent/fees', icon: Wallet, label: 'Fees', end: false },
  { to: '/parent/more', icon: MoreHorizontal, label: 'More', end: false },
];

export function ParentBottomNav() {
  return (
    <nav
      aria-label="Parent navigation"
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center h-16">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className="flex-1">
            {({ isActive }) => (
              <div
                className={`flex flex-col items-center gap-0.5 py-1.5 transition-all duration-200 ${
                  isActive ? 'text-[#5B21B6]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div
                  className={`w-11 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    isActive ? 'bg-[#A855F7]/10' : ''
                  }`}
                >
                  <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
