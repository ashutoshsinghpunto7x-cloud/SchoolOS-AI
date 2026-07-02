import {
  LayoutDashboard,
  GraduationCap,
  Users,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  CalendarCheck,
  IndianRupee,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  BarChart3,
  FileBarChart2,
  Zap,
  Database,
  Plug,
  User2,
  BookOpen,
  Wallet,
  Receipt,
  FileBarChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarNavItem } from './SidebarNavItem';
import { useAuth } from '@/features/auth/hooks/useAuth';

const NAV_ITEMS_ALL = [
  { label: 'Reception',      icon: LayoutDashboard, path: '/reception' },
  { label: 'Students',       icon: GraduationCap,   path: '/students' },
  { label: 'Teachers',       icon: Users,            path: '/teachers' },
  { label: 'Attendance',     icon: CalendarCheck,    path: '/attendance' },
  { label: 'Fees',           icon: IndianRupee,      path: '/fees' },
  { label: 'Calendar',       icon: CalendarDays,     path: '/calendar' },
  { label: 'Timetable',      icon: LayoutGrid,       path: '/timetable' },
  { label: 'Admissions',     icon: ClipboardList,    path: '/enquiries' },
  { label: 'Communication',  icon: MessageSquare,    path: '/communication' },
  { label: 'AI Assistant',   icon: Sparkles,         path: '/ai-assistant' },
] as const;

const NAV_ITEMS_TEACHER = [
  { label: 'My Dashboard',  icon: LayoutDashboard, path: '/teacher' },
  { label: 'My Classes',    icon: BookOpen,         path: '/teacher/classes' },
  { label: 'History',       icon: ClipboardList,    path: '/teacher/history' },
  { label: 'Timetable',     icon: LayoutGrid,       path: '/teacher/timetable' },
  { label: 'My Profile',    icon: User2,             path: '/teacher/profile' },
] as const;

const NAV_ITEMS_ACCOUNTANT = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/accountant' },
  { label: 'Collect Fee',   icon: IndianRupee,     path: '/accountant/collect-fee' },
  { label: 'Fee Records',   icon: ClipboardList,    path: '/accountant/fee-records' },
  { label: 'Pending Fees',  icon: Wallet,           path: '/accountant/pending-fees' },
  { label: 'Salary',        icon: FileBarChart,     path: '/accountant/salary' },
  { label: 'Expenses',      icon: Receipt,          path: '/accountant/expenses' },
  { label: 'Reports',       icon: FileBarChart2,    path: '/accountant/reports' },
] as const;

const NAV_ITEMS_ADMIN = [
  { label: 'Principal',      icon: BarChart3,      path: '/principal' },
  { label: 'Reports',        icon: FileBarChart2,  path: '/reports' },
  { label: 'Automation',     icon: Zap,            path: '/automation' },
  { label: 'Data Import',    icon: Database,       path: '/import' },
  { label: 'Integrations',   icon: Plug,           path: '/integrations' },
  { label: 'Administration', icon: ShieldCheck,    path: '/administration' },
] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  reception: 'Receptionist',
  teacher: 'Teacher',
  accountant: 'Accountant',
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, logout } = useAuth();

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Loading…';
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : '';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-full w-[260px] flex-col',
        'bg-white/98 backdrop-blur-xl',
        'border-r border-gray-100/80',
        'shadow-[1px_0_0_0_rgba(0,0,0,0.04),4px_0_16px_0_rgba(0,0,0,0.03)]',
        'transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
    >
      {/* ── School brand ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100/80">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <GraduationCap className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight tracking-tight">
              Sunrise Academy
            </div>
            <div className="text-[11px] text-gray-400 font-medium tracking-wide mt-px">
              SchoolOS AI
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {user?.role === 'teacher' ? (
          <>
            <p className="px-3 pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Teacher Portal
            </p>
            {NAV_ITEMS_TEACHER.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </>
        ) : user?.role === 'accountant' ? (
          <>
            <p className="px-3 pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Accountant Portal
            </p>
            {NAV_ITEMS_ACCOUNTANT.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </>
        ) : (
          <>
            <p className="px-3 pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Workspaces
            </p>
            {NAV_ITEMS_ALL.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
              />
            ))}
            {user?.role === 'admin' && NAV_ITEMS_ADMIN.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </>
        )}
      </nav>

      {/* ── Bottom section ─────────────────────────────────────────────── */}
      {/* Extra bottom padding on mobile so Log Out isn't hidden behind the fixed mobile bottom nav bar */}
      <div className="border-t border-gray-100/80 px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-3 space-y-0.5">
        <SidebarNavItem to="/settings" icon={Settings} label="Settings" />

        {/* Current user */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-default mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {displayName}
            </div>
            <div className="text-xs text-gray-400 truncate mt-px">{roleLabel}</div>
          </div>
        </div>

        <button
          onClick={() => void logout()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          type="button"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
