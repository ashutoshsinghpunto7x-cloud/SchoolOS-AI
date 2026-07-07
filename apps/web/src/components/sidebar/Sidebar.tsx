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
  UserPlus,
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

const NAV_ITEMS_TEACHER_QUICK_ACTIONS = [
  { label: 'Add Students',  icon: UserPlus,         path: '/teacher/add-student' },
] as const;

const NAV_ITEMS_ACCOUNTANT = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/accountant',               end: true  },
  { label: 'Collect Fee',   icon: IndianRupee,     path: '/accountant/collect-fee',   end: false },
  { label: 'Fee Records',   icon: ClipboardList,   path: '/accountant/fee-records',   end: false },
  { label: 'Pending Fees',  icon: Wallet,          path: '/accountant/pending-fees',  end: false },
  { label: 'Salary',        icon: FileBarChart,    path: '/accountant/salary',        end: false },
  { label: 'Expenses',      icon: Receipt,         path: '/accountant/expenses',      end: false },
  { label: 'Reports',       icon: FileBarChart2,   path: '/accountant/reports',       end: false },
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
  principal: 'Principal',
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

  const isAccountant = user?.role === 'accountant';
  const isTeacher = user?.role === 'teacher';
  // Teacher sidebar uses the exact same liquid-glass green look as Accountant.
  const useEmeraldSidebar = isAccountant || isTeacher;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-full w-[260px] flex-col',
        useEmeraldSidebar
          ? 'liquid-glass-sidebar border-r border-white/5 shadow-[1px_0_0_0_rgba(255,255,255,0.05),inset_-1px_0_0_0_rgba(255,255,255,0.06),inset_1px_0_0_0_rgba(255,255,255,0.04)]'
          : 'bg-white/98 backdrop-blur-xl border-r border-gray-100/80 shadow-[1px_0_0_0_rgba(0,0,0,0.04),4px_0_16px_0_rgba(0,0,0,0.03)]',
        'transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
    >
      {/* ── School brand ──────────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center justify-between px-5 py-5",
        useEmeraldSidebar ? "border-b border-white/5" : "border-b border-gray-100/80"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-9 h-9 flex items-center justify-center shadow-sm rounded-xl",
            useEmeraldSidebar
              ? "bg-white/10 text-white border border-white/10 backdrop-blur-sm"
              : "bg-blue-600 text-white"
          )}>
            <GraduationCap className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </div>
          <div>
            <div className={cn(
              "text-sm font-bold leading-tight tracking-tight",
              useEmeraldSidebar ? "text-white" : "text-gray-900"
            )}>
              Sunrise Academy
            </div>
            <div className={cn(
              "text-[11px] font-medium tracking-wide mt-px",
              useEmeraldSidebar ? "text-white/60" : "text-gray-400"
            )}>
              FNIC
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className={cn(
            "lg:hidden p-1.5 rounded-lg transition-colors",
            useEmeraldSidebar
              ? "text-white/60 hover:text-white hover:bg-white/10"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          )}
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {user?.role === 'teacher' ? (
          <>
            <p className="px-3 pb-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">
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
            <p className="px-3 pb-1 pt-4 text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Quick Actions
            </p>
            {NAV_ITEMS_TEACHER_QUICK_ACTIONS.map((item) => (
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
            <p className="px-3 pb-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Accountant Portal
            </p>
            {NAV_ITEMS_ACCOUNTANT.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                end={item.end}
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
            {(user?.role === 'admin' || user?.role === 'principal') && NAV_ITEMS_ADMIN.map((item) => (
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
      <div className={cn(
        "px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-3 space-y-0.5",
        useEmeraldSidebar ? "border-t border-white/5" : "border-t border-gray-100/80"
      )}>
        <SidebarNavItem to="/settings" icon={Settings} label="Settings" />

        {/* Current user */}
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-default mt-1 transition-colors",
          useEmeraldSidebar ? "hover:bg-white/5" : "hover:bg-gray-50"
        )}>
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
              useEmeraldSidebar
                ? "bg-white/10 text-white border border-white/10"
                : "bg-gradient-to-br from-[#5B5CEB] to-indigo-500 text-white"
            )}>
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-sm font-semibold truncate leading-tight",
              useEmeraldSidebar ? "text-white" : "text-gray-900"
            )}>
              {displayName}
            </div>
            <div className={cn(
              "text-xs truncate mt-px",
              useEmeraldSidebar ? "text-white/60" : "text-gray-400"
            )}>
              {roleLabel}
            </div>
          </div>
        </div>

        <button
          onClick={() => void logout()}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
            useEmeraldSidebar
              ? "text-white/70 hover:bg-white/10 hover:text-white"
              : "text-gray-500 hover:bg-red-50 hover:text-red-600"
          )}
          type="button"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
