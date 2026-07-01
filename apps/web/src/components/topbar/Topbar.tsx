import { useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const formatDate = (): string =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

interface TopbarProps {
  onMenuToggle: () => void;
}

export const Topbar = ({ onMenuToggle }: TopbarProps) => {
  const location = useLocation();
  const section = getLabel(location.pathname);
  const subLabel = getSubLabel(location.pathname);
  const date = formatDate();

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
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-gray-900">{section}</span>
        {subLabel && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" strokeWidth={2.5} />
            <span className="text-sm font-medium text-gray-500">{subLabel}</span>
          </>
        )}
      </nav>

      {/* Right-side controls */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Date chip */}
        <span className="hidden md:flex items-center h-8 px-3 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-500 mr-1 select-none">
          {date}
        </span>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
          <span className="absolute top-[9px] right-[9px] w-[7px] h-[7px] bg-red-500 rounded-full ring-[1.5px] ring-white" />
        </button>

        {/* Avatar */}
        <button
          className="ml-0.5 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm"
          aria-label="Profile"
        >
          <span className="text-xs font-bold text-white">A</span>
        </button>
      </div>
    </header>
  );
};
