import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, ChevronRight, Search, ChevronDown, Clock, GraduationCap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { ReminderPanel } from '@/features/reminders/components/ReminderPanel';
import { studentsApi } from '@/features/students/api/students.api';

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
  return key ? WORKSPACE_LABELS[key] : 'FNIC';
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

const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

const formatTime = (d: Date): string =>
  d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });

// ── Live IST clock ────────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Mini calendar popover ─────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MiniCalendar({ today, onClose }: { today: Date; onClose: () => void }) {
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
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

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  function goPrevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else { setViewMonth((m) => m - 1); }
  }
  function goNextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else { setViewMonth((m) => m + 1); }
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 bg-white rounded-2xl border border-[#E8E8E8] shadow-[0_16px_48px_rgba(0,0,0,0.14)] p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Previous month"
        >
          <ChevronRight className="w-4 h-4 rotate-180" strokeWidth={2} />
        </button>
        <p className="text-[13px] font-semibold text-gray-900">{monthLabel}</p>
        <button
          type="button"
          onClick={goNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-gray-400 text-center h-7 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          const isToday =
            d !== null &&
            d === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();
          return (
            <div key={i} className="h-8 flex items-center justify-center">
              {d !== null && (
                <span
                  className={cn(
                    'w-7 h-7 flex items-center justify-center text-[12px] rounded-full transition-colors',
                    isToday ? 'bg-[#10B981] text-white font-bold' : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  {d}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Student search (accountant workspace) ────────────────────────────────────

function TopbarSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['topbar-student-search', debounced],
    queryFn: () => studentsApi.list(debounced),
    enabled: debounced.length >= 2,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showDropdown = open && debounced.length >= 2;

  function goToStudent(studentId: string) {
    navigate(`/accountant/collect-fee?studentId=${studentId}`);
    setQuery('');
    setDebounced('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && results && results.length > 0) {
      goToStudent(results[0]._id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="hidden md:flex flex-1 max-w-md ml-8 relative">
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search students, receipts, invoices..."
          className="w-full h-8.5 pl-9.5 pr-4 rounded-full bg-white border border-[#E8E8E8] text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#10B981]/30 focus:shadow-[0_2px_12px_rgba(16,185,129,0.04)] transition-all"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-white rounded-2xl border border-[#E8E8E8] shadow-[0_16px_48px_rgba(0,0,0,0.14)] overflow-hidden max-h-80 overflow-y-auto">
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </div>
          ) : results && results.length > 0 ? (
            results.map((s) => (
              <button
                key={s._id}
                type="button"
                onClick={() => goToStudent(s._id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#10B981]/5 transition-colors border-b border-[#E8E8E8] last:border-b-0"
              >
                <span className="w-8 h-8 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-[#0B3D2E]" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-gray-800 truncate">{s.fullName}</span>
                  <span className="block text-[11px] text-gray-400">
                    Class {s.class}{s.section} · Adm. No. {s.admissionNumber}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">No students found for "{debounced}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface TopbarProps {
  onMenuToggle: () => void;
}

export const Topbar = ({ onMenuToggle }: TopbarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isTeacher = user?.role === 'teacher';
  // Teacher dashboard uses the exact same emerald palette/effects as the
  // Accountant workspace — no other colors anywhere on that dashboard.
  const useEmeraldStyle = isAccountant || isTeacher;
  const isAccountantDashboard = isAccountant && location.pathname === '/accountant';
  const section = isAccountantDashboard
    ? `${greeting()}, ${user?.firstName ?? 'Accountant'}`
    : getLabel(location.pathname);
  const subLabel = isAccountantDashboard ? null : getSubLabel(location.pathname);

  const now = useNow();
  const date = formatDate(now);
  const time = formatTime(now);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-[60px] items-center',
        useEmeraldStyle
          ? 'bg-white border-b border-[#E8E8E8] px-8'
          : 'bg-white/90 backdrop-blur-xl border-b border-gray-100/80 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] px-6',
      )}
    >
      <div className={cn("flex items-center w-full gap-4", useEmeraldStyle && "max-w-7xl mx-auto")}>
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className={cn(
            "lg:hidden p-2 -ml-1 rounded-xl transition-colors",
            useEmeraldStyle
              ? "text-gray-500 hover:bg-[#10B981]/5 hover:text-[#0B3D2E]"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
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
        {isAccountant && <TopbarSearch />}

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Live clock — tap to open reminders */}
          {useEmeraldStyle && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setReminderOpen((v) => !v)}
                className="hidden lg:flex items-center gap-1.5 h-8.5 px-3.5 rounded-full bg-white border border-[#E8E8E8] text-[12px] font-semibold text-gray-600 select-none tabular-nums transition-colors hover:bg-[#10B981]/5 hover:border-[#10B981]/25"
              >
                <Clock className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                {time} IST
              </button>
              {reminderOpen && <ReminderPanel onClose={() => setReminderOpen(false)} />}
            </div>
          )}

          {/* Date chip / calendar trigger */}
          <div className="relative">
            {useEmeraldStyle ? (
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="hidden md:flex items-center gap-1.5 h-8.5 px-3.5 rounded-full bg-white border border-[#E8E8E8] text-[12px] font-medium text-gray-500 select-none transition-colors hover:bg-[#10B981]/5 hover:border-[#10B981]/25"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {date}
              </button>
            ) : (
              <span className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-500 mr-1 select-none">
                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {date}
              </span>
            )}

            {calendarOpen && <MiniCalendar today={now} onClose={() => setCalendarOpen(false)} />}
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar */}
          <button
            className={cn(
              "ml-0.5 flex items-center gap-1.5 p-1 rounded-full transition-all duration-200",
              useEmeraldStyle
                ? "bg-white border border-[#E8E8E8] hover:bg-[#10B981]/5 hover:border-[#10B981]/20 shadow-sm"
                : "hover:bg-gray-100"
            )}
            aria-label="Profile"
          >
            {useEmeraldStyle ? (
              <span className="w-7 h-7 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[11px] font-bold text-[#0B3D2E]">
                {initials}
              </span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">{initials}</span>
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block mr-1" />
          </button>
        </div>
      </div>
    </header>
  );
};
