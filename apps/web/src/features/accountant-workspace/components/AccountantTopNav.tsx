import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, IndianRupee, ClipboardList, Wallet, Receipt, FileBarChart,
  Store, FileBarChart2, GraduationCap, Users, Upload, Settings2, Mail,
  ChevronDown, Menu, X, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Mirrors the section groupings the accountant sidebar used to have (see
// project_accountant_workspace memory) — same links, just laid out as a
// horizontal bar with dropdown submenus instead of a docked left panel, so
// the fee-collection screen (and every other accountant page) gets the full
// page width back.

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold transition-colors',
          active ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-600 hover:bg-gray-100',
        )}
      >
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

export function AccountantTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <div className="sticky top-[60px] z-[9] bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center h-12 gap-1">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Desktop nav row */}
        <nav className="hidden lg:flex items-center gap-1">
          <NavLink
            to="/accountant" end
            className={({ isActive }) => cn(
              'flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold transition-colors',
              isActive ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>

          {GROUPS.map((group) => (
            <NavDropdown key={group.label} group={group} pathname={location.pathname} />
          ))}

          <NavLink
            to="/accountant/vendors"
            className={({ isActive }) => cn(
              'flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold transition-colors',
              isActive ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            <Store className="w-4 h-4" /> Vendors
          </NavLink>

          <NavLink
            to="/accountant/reports"
            className={({ isActive }) => cn(
              'flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold transition-colors',
              isActive ? 'bg-[#A855F7]/10 text-[#5B21B6]' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            <FileBarChart2 className="w-4 h-4" /> Reports
          </NavLink>
        </nav>

        <div className="ml-auto hidden lg:flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
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
