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
  FileBarChart2,
  Zap,
  Database,
  Plug,
  User2,
  BookOpen,
  Wallet,
  FileBarChart,
  UserPlus,
  Mail,
  BadgePercent,
  UserCog,
  KeyRound,
  ClipboardCheck,
  CreditCard,
  QrCode,
  ScanLine,
  FileCheck2,
  CalendarClock,
  Bus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SidebarNavItem } from './SidebarNavItem';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { getHomePathForRole } from '@/features/auth/utils/roleHome';
import fnicLogo from '@/assets/illustrations/fnic-logo.jpg';
import { usePendingLeaveRequests } from '@/features/leave-requests/hooks/useLeaveRequests';
import { usePendingChangeRequests } from '@/features/student-change-requests/hooks/useStudentChangeRequests';
import { usePendingDiscounts } from '@/features/fees/hooks/useFeeStructure';
import { usePendingTestApprovals } from '@/features/mock-tests/hooks/useMockTests';

// Reception gets its own dedicated nav, focused on front-desk tasks — not
// the full admin operational toolbox. Trimmed to just the two things
// reception actually does day-to-day (2026-08-17); the dashboard itself
// still exists as their post-login home (see roleHome.ts) and is still
// reachable via the logo, it's just not a persistent nav item anymore.
const NAV_ITEMS_RECEPTION = [
  { label: 'Visitor Log',         icon: UserPlus,        path: '/reception/visitors',   end: false },
  { label: 'Attendance Records',  icon: CalendarCheck,   path: '/reception/attendance', end: false },
] as const;

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
  { label: 'Messages',       icon: Mail,             path: '/messages' },
  { label: 'AI Assistant',   icon: Sparkles,         path: '/ai-assistant' },
] as const;

const NAV_ITEMS_TEACHER = [
  { label: 'My Dashboard',  icon: LayoutDashboard, path: '/teacher' },
  { label: 'My Classes',    icon: BookOpen,         path: '/teacher/classes' },
  { label: 'History',       icon: ClipboardList,    path: '/teacher/history' },
  { label: 'Timetable',     icon: LayoutGrid,       path: '/teacher/timetable' },
  { label: 'Messages',      icon: Mail,             path: '/messages' },
  { label: 'My Profile',    icon: User2,             path: '/teacher/profile' },
] as const;

const NAV_ITEMS_TEACHER_QUICK_ACTIONS = [
  { label: 'Add Students',  icon: UserPlus,         path: '/teacher/add-student' },
] as const;

// Accountant no longer uses this left sidebar — it has its own top nav bar
// with dropdown submenus instead (see AccountantTopNav), so its dense pages
// get the full page width. See project_accountant_workspace memory.

const NAV_ITEMS_ADMIN = [
  { label: 'Reports',            icon: FileBarChart2,  path: '/reports' },
  { label: 'Classes & Sections', icon: GraduationCap,  path: '/classes' },
  { label: 'Exams',              icon: ClipboardCheck, path: '/exams' },
  { label: 'Report Card Templates', icon: FileBarChart, path: '/report-card-templates' },
  { label: 'Report Cards',       icon: ClipboardList,  path: '/term-report-cards' },
  { label: 'Teacher Logins',     icon: KeyRound,       path: '/teacher-logins' },
  { label: 'Automation',         icon: Zap,            path: '/automation' },
  { label: 'Data Import',        icon: Database,       path: '/import' },
  { label: 'Integrations',       icon: Plug,           path: '/integrations' },
  { label: 'Administration',     icon: ShieldCheck,    path: '/administration' },
  { label: 'Transport',          icon: Bus,            path: '/transport' },
] as const;

// Smart QR Attendance & Payroll — Phase 1 (HR admin tools) + Phase 2 (payroll UI).
const NAV_ITEMS_HR = [
  { label: 'Employees',     icon: Users,    path: '/admin/employees' },
  { label: 'Attendance',    icon: ScanLine, path: '/admin/attendance-qr' },
  { label: 'ID Cards',      icon: CreditCard, path: '/admin/id-cards' },
  { label: 'QR Management', icon: QrCode,   path: '/admin/qr-management' },
  { label: 'Payroll',       icon: Wallet,   path: '/admin/payroll' },
] as const;

// Principal gets its own dedicated nav — not the admin operational toolbox.
// Grouped into labeled sections (was one flat 19-item list) so the panel
// reads as a set of related tasks instead of a wall of text. "Change
// Password" was dropped here — it's already reachable from the profile
// dropdown in the topbar (see Topbar.tsx ProfileMenu), so it was a dupe.
const NAV_SECTION_PRINCIPAL_OVERVIEW = [
  { label: 'Dashboard',  icon: LayoutDashboard, path: '/principal',           end: true  },
] as const;

// Everything a principal needs to sign off on — grouped together since it's
// the "clear my queue" cluster, and badge-counted with live pending totals.
const NAV_SECTION_PRINCIPAL_APPROVALS = [
  { label: 'Leave Approvals',    icon: ClipboardList,  path: '/principal/leave-approvals',    end: false, badgeKey: 'leave' },
  { label: 'Test Approvals',     icon: FileCheck2,     path: '/principal/test-approvals',     end: false, badgeKey: 'tests' },
] as const;

const NAV_SECTION_PRINCIPAL_ACADEMICS = [
  { label: 'Planner',              icon: CalendarClock,  path: '/principal/planner',       end: false },
  { label: 'Exams',                icon: ClipboardList,  path: '/exams',                    end: false },
  { label: 'Report Card Templates', icon: FileBarChart,  path: '/report-card-templates',   end: false },
  { label: 'Report Cards',         icon: ClipboardCheck, path: '/term-report-cards',        end: false },
  { label: 'Calendar',             icon: CalendarDays,   path: '/calendar',                 end: false },
] as const;

const NAV_SECTION_PRINCIPAL_STAFF = [
  { label: 'Teachers',          icon: Users,          path: '/principal/teachers',        end: false },
  { label: 'Class Teachers',    icon: GraduationCap,  path: '/principal/class-teachers',  end: false },
  { label: 'Teacher Timetable', icon: UserCog,        path: '/timetable/teacher-builder', end: false },
] as const;

const NAV_SECTION_PRINCIPAL_OPERATIONS = [
  { label: 'Class Timetable',    icon: LayoutGrid, path: '/timetable',                    end: true  },
  { label: 'Attendance Scanner', icon: ScanLine,    path: '/principal/attendance-scanner', end: false },
  { label: 'Transport',          icon: Bus,         path: '/principal/transport',          end: false },
  { label: 'Messages',           icon: Mail,        path: '/messages',                     end: false },
] as const;

const NAV_SECTIONS_PRINCIPAL = [
  { title: 'Overview',   items: NAV_SECTION_PRINCIPAL_OVERVIEW },
  { title: 'Approvals',  items: NAV_SECTION_PRINCIPAL_APPROVALS },
  { title: 'Academics',  items: NAV_SECTION_PRINCIPAL_ACADEMICS },
  { title: 'Staff',      items: NAV_SECTION_PRINCIPAL_STAFF },
  { title: 'Operations', items: NAV_SECTION_PRINCIPAL_OPERATIONS },
] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  principal: 'Principal',
  reception: 'Receptionist',
  teacher: 'Teacher',
  accountant: 'Accountant',
};

// Isolated so its badge-count hooks only fire for principal sessions —
// they live here, not in Sidebar itself, so they never run (or trigger
// network calls) for other roles.
const PrincipalNavSections = () => {
  const { data: leave } = usePendingLeaveRequests();
  const { data: changeRequests } = usePendingChangeRequests();
  const { data: discounts } = usePendingDiscounts();
  const { data: testApprovals } = usePendingTestApprovals();

  const badgeCounts: Record<string, number> = {
    leave: leave?.length ?? 0,
    editRequests: changeRequests?.length ?? 0,
    discounts: discounts?.length ?? 0,
    tests: testApprovals?.length ?? 0,
  };

  return (
    <>
      <p className="px-3 pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Principal Portal
      </p>
      {NAV_SECTIONS_PRINCIPAL.map((section, idx) => (
        <div key={section.title} className={idx > 0 ? 'pt-4' : undefined}>
          <p className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {section.title}
          </p>
          {section.items.map((item) => (
            <SidebarNavItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              end={item.end}
              badge={'badgeKey' in item ? badgeCounts[item.badgeKey] : undefined}
            />
          ))}
        </div>
      ))}
    </>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, the sidebar never permanently docks — even on desktop it's a
   *  hidden overlay that only shows once `isOpen` is toggled from the topbar. */
  overlayOnDesktop?: boolean;
}

export const Sidebar = ({ isOpen, onClose, overlayOnDesktop }: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: schoolSettings } = useSchoolSettings();

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Loading…';
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : '';

  const isAccountant = user?.role === 'accountant';
  const isPrincipal = user?.role === 'principal';
  // Accountant uses the same purple/pink liquid-glass panel as the teacher
  // portal so all three role sidebars share one visual language. Principal's
  // sidebar is clean white — purple/pink shows up only as accents (logo
  // badge, active nav pill, avatar) rather than the whole panel.
  const useDarkSidebar = isAccountant;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-full w-[260px] flex-col',
        useDarkSidebar
          ? 'liquid-glass-sidebar-purple border-r border-white/5 shadow-[1px_0_0_0_rgba(255,255,255,0.05),inset_-1px_0_0_0_rgba(255,255,255,0.06),inset_1px_0_0_0_rgba(255,255,255,0.04)]'
          : 'bg-white/98 backdrop-blur-xl border-r border-gray-100/80 shadow-[1px_0_0_0_rgba(0,0,0,0.04),4px_0_16px_0_rgba(0,0,0,0.03)]',
        'transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        !overlayOnDesktop && 'lg:translate-x-0'
      )}
    >
      {/* ── School brand ──────────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center justify-between px-5 py-5",
        useDarkSidebar ? "border-b border-white/5" : "border-b border-gray-100/80"
      )}>
        <button
          type="button"
          onClick={() => navigate(user ? getHomePathForRole(user.role) : '/')}
          className="flex items-center gap-3 text-left"
          title="Go to dashboard"
        >
          <div className={cn(
            "flex-shrink-0 w-9 h-9 flex items-center justify-center shadow-sm rounded-xl overflow-hidden",
            useDarkSidebar
              ? "bg-white/10 text-white border border-white/10 backdrop-blur-sm"
              : isPrincipal
              ? "bg-gradient-to-br from-violet-600 to-pink-500 text-white"
              : "bg-blue-600 text-white"
          )}>
            <img src={schoolSettings?.logoUrl || fnicLogo} alt="School logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className={cn(
              "text-sm font-bold leading-tight tracking-tight",
              useDarkSidebar ? "text-white" : "text-gray-900"
            )}>
              FNIC
            </div>
            <div className={cn(
              "text-[11px] font-medium tracking-wide mt-px",
              useDarkSidebar ? "text-white/60" : "text-gray-400"
            )}>
              School Management System
            </div>
          </div>
        </button>

        <button
          onClick={onClose}
          className={cn(
            !overlayOnDesktop && "lg:hidden", "p-1.5 rounded-lg transition-colors",
            useDarkSidebar
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
        ) : user?.role === 'principal' ? (
          <PrincipalNavSections />
        ) : user?.role === 'reception' ? (
          <>
            <p className="px-3 pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Reception Portal
            </p>
            {NAV_ITEMS_RECEPTION.map((item) => (
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
            {user?.role === 'admin' && NAV_ITEMS_ADMIN.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
              />
            ))}
            {user?.role === 'admin' && (
              <>
                <p className="px-3 pb-1 pt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  HR Management
                </p>
                {NAV_ITEMS_HR.map((item) => (
                  <SidebarNavItem
                    key={item.path}
                    to={item.path}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </>
            )}
          </>
        )}
      </nav>

      {/* ── Bottom section ─────────────────────────────────────────────── */}
      {/* Extra bottom padding on mobile so Log Out isn't hidden behind the fixed mobile bottom nav bar */}
      <div className={cn(
        "px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-3 space-y-0.5",
        useDarkSidebar ? "border-t border-white/5" : "border-t border-gray-100/80"
      )}>
        {/* Principal accesses Settings from the profile dropdown in the topbar instead */}
        {!isPrincipal && <SidebarNavItem to="/settings" icon={Settings} label="Settings" />}

        {/* Current user */}
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-default mt-1 transition-colors",
          useDarkSidebar ? "hover:bg-white/5" : "hover:bg-gray-50"
        )}>
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
              useDarkSidebar
                ? "bg-white/10 text-white border border-white/10"
                : isPrincipal
                ? "bg-gradient-to-br from-violet-600 to-pink-500 text-white"
                : "bg-gradient-to-br from-[#5B5CEB] to-indigo-500 text-white"
            )}>
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-sm font-semibold truncate leading-tight",
              useDarkSidebar ? "text-white" : "text-gray-900"
            )}>
              {displayName}
            </div>
            <div className={cn(
              "text-xs truncate mt-px",
              useDarkSidebar ? "text-white/60" : "text-gray-400"
            )}>
              {roleLabel}
            </div>
          </div>
        </div>

        <button
          onClick={() => void logout()}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
            useDarkSidebar
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
