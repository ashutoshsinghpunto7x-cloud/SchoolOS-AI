import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, IndianRupee, ClipboardList, Wallet, Receipt, FileBarChart,
  Store, FileBarChart2, GraduationCap, Users, Upload, Settings2, Mail,
  ChevronDown, Menu, X, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

// Single combined header for the whole accountant workspace: nav (Dashboard/
// Fees/Expenses/Other/Vendors/Reports, each its own bordered box) on the
// left, live clock + date + notifications + profile (Settings/Log Out live
// inside its dropdown now, not as standalone buttons) on the right. This
// replaces what used to be two stacked rows — a generic Topbar breadcrumb
// ("Accountant Workspace") above this nav — collapsed into one so every
// accountant page keeps its full width instead of losing a row to a label
// that repeated what the nav below it already said.

interface NavLeaf { label: string; path: string; icon: React.ElementType; end?: boolean }
interface NavGroup { label: string; icon: React.ElementType; items: NavLeaf[] }

const FEES: NavGroup = {
  label: 'Fees', icon: IndianRupee,
  items: [
    { label: 'Collect Fee',   path: '/accountant/collect-fee',   icon: IndianRupee },
    { label: 'Fee Records',   path: '/accountant/fee-records',   icon: ClipboardList },
    { label: 'Pending Fees',  path: '/accountant/pending-fees',  icon: Wallet },
    { label: 'Fee Structure', path: '/accountant/fee-structure', icon: IndianRupee },
  ],
};

const EXPENSES: NavGroup = {
  label: 'Expenses', icon: Receipt,
  items: [
    { label: 'Expenses', path: '/accountant/expenses', icon: Receipt },
    { label: 'Salary',   path: '/accountant/salary',   icon: FileBarChart },
  ],
};

const OTHER: NavGroup = {
  label: 'Other', icon: Settings2,
  items: [
    { label: 'Students',  path: '/accountant/student-directory', icon: GraduationCap },
    { label: 'Teachers',  path: '/accountant/teachers',          icon: Users },
    { label: 'Employees', path: '/accountant/employees',         icon: Users },
    { label: 'Import',    path: '/import',                       icon: Upload },
    { label: 'Classes',   path: '/classes',                      icon: Settings2 },
    { label: 'Messages',  path: '/messages',                     icon: Mail },
  ],
};

const GROUPS = [FEES, EXPENSES, OTHER];

function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((i) => pathname === i.path || pathname.startsWith(`${i.path}/`));
}

// Shared look for every top-level nav control — Dashboard, each dropdown
// trigger, Vendors, Reports — so they read as a row of distinct boxes.
const navBoxCls = (active: boolean) => cn(
  'flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-semibold transition-colors',
  active ? 'bg-[#A855F7]/10 border-[#A855F7]/30 text-[#5B21B6]' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
);

// ── Live IST clock ────────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const formatTime = (d: Date): string =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

// ── One dropdown ("Fees ▾", "Expenses ▾", "Other ▾") ────────────────────────

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = isGroupActive(group, pathname);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={navBoxCls(active)}>
        <group.icon className="w-4 h-4" />
        {group.label}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-56 bg-white rounded-xl border border-gray-200 shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden py-1.5">
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'text-[#5B21B6] bg-[#A855F7]/5' : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              <item.icon className="w-4 h-4 text-gray-400" />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Profile dropdown — avatar opens Settings / Log Out, replacing the two
//    standalone buttons that used to sit at the end of the nav row ──────────

function ProfileMenu({ displayName, onClose, onNavigateSettings, onLogout }: {
  displayName: string;
  onClose: () => void;
  onNavigateSettings: () => void;
  onLogout: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 bg-white rounded-2xl border border-[#E8E8E8] shadow-[0_16px_48px_rgba(0,0,0,0.14)] overflow-hidden py-1.5"
    >
      <div className="px-4 py-2.5 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
        <p className="text-xs text-gray-400">Accountant</p>
      </div>
      <button
        type="button"
        onClick={onNavigateSettings}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <Settings className="w-4 h-4 text-gray-400" />
        Settings
      </button>
      <div className="border-t border-gray-50 mt-1 pt-1">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}

export function AccountantTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const now = useNow();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';
  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '?';

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 flex items-center h-14 gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Desktop nav row — every entry its own bordered box */}
        <nav className="hidden lg:flex items-center gap-2">
          <NavLink to="/accountant" end className={({ isActive }) => navBoxCls(isActive)}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>

          {GROUPS.map((group) => (
            <NavDropdown key={group.label} group={group} pathname={location.pathname} />
          ))}

          <NavLink to="/accountant/vendors" className={({ isActive }) => navBoxCls(isActive)}>
            <Store className="w-4 h-4" /> Vendors
          </NavLink>

          <NavLink to="/accountant/reports" className={({ isActive }) => navBoxCls(isActive)}>
            <FileBarChart2 className="w-4 h-4" /> Reports
          </NavLink>
        </nav>

        {/* Right-side utility cluster — clock, date, notifications, profile */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 select-none tabular-nums">
            {formatTime(now)} IST
          </div>
          <div className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-500 select-none">
            {formatDate(now)}
          </div>

          <NotificationBell />

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Profile"
            >
              <span className="w-7 h-7 rounded-full bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center text-[11px] font-bold text-[#5B21B6]">
                {initials}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
            </button>
            {profileOpen && (
              <ProfileMenu
                displayName={displayName}
                onClose={() => setProfileOpen(false)}
                onNavigateSettings={() => { setProfileOpen(false); navigate('/settings'); }}
                onLogout={() => { setProfileOpen(false); void logout(); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu — flat, stacked list of every link, grouped by section header */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 px-4 py-3 max-h-[70vh] overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 pb-1.5">{displayName}</p>
          <NavLink to="/accountant" end className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold', isActive ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-700')}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pb-1">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path} to={item.path}
                  className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', isActive ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-700')}
                >
                  <item.icon className="w-4 h-4 text-gray-400" /> {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="mt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pb-1">More</p>
            <NavLink to="/accountant/vendors" className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', isActive ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-700')}>
              <Store className="w-4 h-4 text-gray-400" /> Vendors
            </NavLink>
            <NavLink to="/accountant/reports" className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', isActive ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-700')}>
              <FileBarChart2 className="w-4 h-4 text-gray-400" /> Reports
            </NavLink>
            <button type="button" onClick={() => navigate('/settings')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 text-left">
              <Settings className="w-4 h-4 text-gray-400" /> Settings
            </button>
            <button type="button" onClick={() => void logout()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 text-left">
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
