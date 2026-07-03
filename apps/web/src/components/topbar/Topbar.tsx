import { useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

const WORKSPACE_LABELS: Record<string, string> = {
  '/reception': 'Reception',
  '/students': 'Students',
  '/communication': 'Communication',
  '/ai-assistant': 'AI Assistant',
  '/administration': 'Administration',
  '/settings': 'Settings',
  '/accountant': 'Accountant Workspace',
};

const getLabel = (pathname: string): string => {
  const key = Object.keys(WORKSPACE_LABELS).find((k) => pathname.startsWith(k));
  return key ? WORKSPACE_LABELS[key] : 'SchoolOS AI';
};

const getSubLabel = (pathname: string): string | null => {
  if (/\/students\/[^/]+\/communications/.test(pathname)) return 'Communications';
  if (/\/students\/[^/]+\/edit/.test(pathname)) return 'Edit Student';
  if (/\/students\/[^/]+$/.test(pathname)) return 'Profile';
  if (pathname === '/students/new') return 'New Admission';
  return null;
};

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = (): string =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

interface TopbarProps {
  onMenuToggle: () => void;
}

export const Topbar = ({ onMenuToggle }: TopbarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isAccountantDashboard = isAccountant && location.pathname === '/accountant';
  const section = isAccountantDashboard
    ? `${greeting()}, ${user?.firstName ?? 'Accountant'}`
    : getLabel(location.pathname);
  const subLabel = isAccountantDashboard ? null : getSubLabel(location.pathname);
  const date = formatDate();

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-[60px] items-center gap-4',
        'bg-white/90 backdrop-blur-xl',
        'border-b border-gray-100/80',
        'px-6',
        // Subtle bottom shadow for depth
        'shadow-[0_1px_0_0_rgba(0,0,0,0.04)]',
      )}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-semibold text-gray-900">{section}</span>
        {subLabel && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={2.5} />
            <span className="text-sm font-medium text-gray-500">{subLabel}</span>
          </>
        )}
      </nav>

      {/* Search bar (Accountant Workspace) */}
      {isAccountant && (
        <div className="hidden md:flex flex-1 max-w-md ml-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students, receipts, invoices..."
              className="w-full h-9 pl-9 pr-12 rounded-xl bg-gray-50/80 border border-gray-100 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/20 focus:border-[#5B5CEB]/40 transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 px-1.5 rounded-md bg-white border border-gray-200 text-[10px] font-semibold text-gray-400 flex items-center">
              ⌘K
            </span>
          </div>
        </div>
      )}

      {/* Right-side controls */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Date chip */}
        <span className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-500 mr-1 select-none">
          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {date}
        </span>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
          <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-red-500 ring-[1.5px] ring-white text-[9px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>

        {/* Avatar */}
        <button
          className="ml-0.5 flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Profile"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-xs font-bold text-white">{initials}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
        </button>
      </div>
    </header>
  );
};
