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
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white/95 backdrop-blur-sm border-t border-[#E7E4DE]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center h-16">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className="flex-1">
            {({ isActive }) => (
              <div
                className={`flex flex-col items-center gap-1 py-2 transition-colors duration-150 ${
                  isActive ? 'text-[#0D0D0D]' : 'text-[#6B6B6B]'
                }`}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
