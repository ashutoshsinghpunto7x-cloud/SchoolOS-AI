import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, ChevronRight, ChevronDown, Clock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { ReminderPanel } from '@/features/reminders/components/ReminderPanel';
import { PrincipalSearchBar } from '@/features/principal/components/PrincipalSearchBar';
import { useTeacherTheme } from '@/features/teacher-workspace/context/TeacherThemeContext';
import { ACCOUNTANT_HERO_GRADIENT_STYLE } from '@/features/accountant-workspace/gradient';

// ── Premium theme toggle pill ─────────────────────────────────────────────────
// A pill-shaped track with a sliding thumb + sparkle burst on switch.
// Commented out for now per request — re-enable by uncommenting this whole
// block plus its usage further down (search "Theme toggle — teacher
// workspace"), and restore `toggleTheme` to the destructure below and
// `Sun, Moon` / `useCallback` to the imports at the top of this file.

// function ThemeTogglePill({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
//   const [sparkling, setSparkling] = useState(false);
//   const [sparkDir, setSparkDir] = useState<'to-dark' | 'to-light'>('to-dark');
//   const sparkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
//
//   const handleClick = useCallback(() => {
//     if (sparkTimer.current) clearTimeout(sparkTimer.current);
//     setSparkDir(theme === 'light' ? 'to-dark' : 'to-light');
//     setSparkling(false);
//     // Force a reflow so the CSS animation restarts
//     requestAnimationFrame(() => {
//       setSparkling(true);
//       sparkTimer.current = setTimeout(() => setSparkling(false), 600);
//     });
//     onToggle();
//   }, [theme, onToggle]);
//
//   return (
//     <button
//       type="button"
//       onClick={handleClick}
//       aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
//       title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
//       className="relative flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/50 rounded-full"
//     >
//       {/* Sparkle burst */}
//       <span
//         className={cn(
//           'theme-toggle-sparkle',
//           sparkDir,
//           sparkling && 'animate-sparkle'
//         )}
//       />
//
//       {/* Pill track */}
//       <span className="theme-toggle-pill" data-theme={theme}>
//         {/* Thumb */}
//         <span className="theme-toggle-thumb">
//           {theme === 'dark' ? (
//             <Moon className="w-3 h-3 text-white" strokeWidth={2} />
//           ) : (
//             <Sun className="w-3 h-3 text-amber-500" strokeWidth={2} />
//           )}
//         </span>
//       </span>
//     </button>
//   );
// }

const WORKSPACE_LABELS: Record<string, string> = {
  '/reception': 'Reception',
  '/students': 'Students',
  '/communication': 'Communication',
  '/ai-assistant': 'AI Assistant',
  '/administration': 'Administration',
  '/settings': 'Settings',
  '/accountant': 'Accountant Workspace',
  '/principal': 'Principal Dashboard',
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

// 12-hour clock + long-form date for the principal's combined topbar pill.
const formatTime12h = (d: Date): string =>
  d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

const formatDateLong = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  }).replace(/^(\w+), (.+)$/, '$2, $1');

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
                    isToday ? 'bg-[#5B21B6] text-white font-bold' : 'text-gray-700 hover:bg-gray-100',
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


// ── Page ──────────────────────────────────────────────────────────────────────

interface TopbarProps {
  onMenuToggle: () => void;
  /** Accountant-only: shows a desktop-visible sidebar collapse/expand button. */
  showDesktopCollapseToggle?: boolean;
  desktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
}

export const Topbar = ({ onMenuToggle, showDesktopCollapseToggle, desktopCollapsed, onToggleDesktopCollapse }: TopbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isTeacher = user?.role === 'teacher';
  const isPrincipal = user?.role === 'principal';
  // Accountant, Teacher, and Principal all share the same pill/chip topbar
  // treatment, rendered in the same purple accent.
  const usePillTopbar = isAccountant || isTeacher || isPrincipal;
  const isAccountantDashboard = isAccountant && location.pathname === '/accountant';
  // Principal dashboard folds its date/greeting into the Daily Command Centre
  // card instead — the topbar breadcrumb would just repeat it. The accountant
  // dashboard's own purple hero shows the same greeting, so its breadcrumb is
  // skipped the same way (previously it duplicated "Good morning, Name" here
  // AND in the hero below it).
  const isPrincipalDashboard = isPrincipal && location.pathname === '/principal';
  const section = getLabel(location.pathname);
  const subLabel = isAccountantDashboard ? null : getSubLabel(location.pathname);

  const now = useNow();
  const date = isPrincipal ? formatDateLong(now) : formatDate(now);
  const time = isPrincipal ? formatTime12h(now) : formatTime(now);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  // `toggleTheme` is unused while the theme-toggle pill is commented out below —
  // restore it here too when re-enabling.
  const { theme } = useTeacherTheme();

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  const isTeacherDark = isTeacher && theme === 'dark';

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-[60px] items-center',
        // On its own dashboard, the accountant's topbar merges seamlessly into
        // the purple hero card rendered right below it (same gradient, no
        // border) instead of being a separate white strip — the hero already
        // carries the greeting, so this row exists purely for the menu/
        // collapse/notification/avatar controls.
        isAccountantDashboard
          ? 'px-8'
          : usePillTopbar
          ? cn(
              'border-b px-8',
              isTeacherDark
                ? 'teacher-glass-topbar border-white/5'
                : 'bg-white dark:bg-[#0F0821] border-[#E8E8E8] dark:border-white/5'
            )
          : 'bg-white/90 backdrop-blur-xl border-b border-gray-100/80 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] px-6',
      )}
      style={isAccountantDashboard ? ACCOUNTANT_HERO_GRADIENT_STYLE : undefined}
    >
      <div className={cn("flex items-center w-full gap-4", usePillTopbar && "max-w-7xl mx-auto")}>
        {/* Menu toggle — teacher portal has no sidebar; principal's sidebar is an
            overlay at every breakpoint, so it stays visible past lg too */}
        {!isTeacher && (
          <button
            onClick={onMenuToggle}
            className={cn(
              "p-2 -ml-1 rounded-xl transition-colors",
              !isPrincipal && "lg:hidden",
              isAccountantDashboard
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : usePillTopbar
                ? "text-gray-500 hover:bg-[#A855F7]/5 hover:text-[#5B21B6]"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            )}
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Desktop sidebar collapse — accountant only, frees up page width */}
        {showDesktopCollapseToggle && (
          <button
            onClick={onToggleDesktopCollapse}
            className={cn(
              "hidden lg:flex p-2 -ml-1 rounded-xl transition-colors",
              isAccountantDashboard
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-gray-500 hover:bg-[#A855F7]/5 hover:text-[#5B21B6]"
            )}
            aria-label={desktopCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            title={desktopCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {desktopCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}

        {/* Breadcrumb — folded away on the principal's own dashboard (and the
            accountant's own dashboard) where the hero card already carries
            the page's identity, so this would otherwise just repeat it */}
        {!isPrincipalDashboard && !isPrincipal && !isAccountantDashboard && (
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{section}</span>
            {subLabel && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-white/30 flex-shrink-0" strokeWidth={2.5} />
                <span className="text-sm font-medium text-gray-500 dark:text-white/50">{subLabel}</span>
              </>
            )}
          </nav>
        )}

        {/* Global search — principal only */}
        {isPrincipal && <PrincipalSearchBar />}

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Principal: one combined time+date pill, doubling as the reminders trigger */}
          {isPrincipal && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setReminderOpen((v) => !v)}
                className="hidden sm:flex flex-col items-start justify-center h-11 px-4 rounded-xl bg-white border border-gray-200 hover:border-[#A855F7]/30 hover:bg-[#A855F7]/5 transition-colors select-none tabular-nums"
              >
                <span className="text-[13px] font-bold text-gray-900 leading-none">{time}</span>
                <span className="text-[10px] text-gray-400 mt-1 leading-none">{date}</span>
              </button>
              {reminderOpen && <ReminderPanel onClose={() => setReminderOpen(false)} />}
            </div>
          )}

          {/* Accountant dashboard: same idea as the principal's pill (time on
              top, date below) but sized down a notch — the accountant has a
              denser page to work with than the principal's spacious command
              centre. Two independent click targets in one pill: the time
              half opens reminders, the date half opens the mini calendar. */}
          {isAccountantDashboard && (
            <div className="hidden sm:flex items-stretch h-10 rounded-xl bg-white/10 border border-white/15 overflow-hidden select-none tabular-nums">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setReminderOpen((v) => !v)}
                  className="h-10 px-3 flex flex-col items-start justify-center hover:bg-white/10 transition-colors"
                  title="Reminders"
                >
                  <span className="text-[12px] font-bold text-white leading-none">{time}</span>
                  <span className="text-[9px] text-white/60 mt-0.5 leading-none">IST</span>
                </button>
                {reminderOpen && <ReminderPanel onClose={() => setReminderOpen(false)} />}
              </div>
              <div className="w-px bg-white/15 my-1.5" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCalendarOpen((v) => !v)}
                  className="h-10 px-3 flex flex-col items-start justify-center hover:bg-white/10 transition-colors"
                  title="Open calendar"
                >
                  <span className="text-[12px] font-bold text-white leading-none">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  <span className="text-[9px] text-white/60 mt-0.5 leading-none">{new Date().getFullYear()}</span>
                </button>
                {calendarOpen && <MiniCalendar today={now} onClose={() => setCalendarOpen(false)} />}
              </div>
            </div>
          )}

          {/* Live clock — tap to open reminders (teacher/accountant, non-dashboard pages) */}
          {usePillTopbar && !isPrincipal && !isAccountantDashboard && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setReminderOpen((v) => !v)}
                className="hidden lg:flex items-center gap-1.5 h-8.5 px-3.5 rounded-full bg-white dark:bg-white/5 border border-[#E8E8E8] dark:border-white/10 text-[12px] font-semibold text-gray-600 dark:text-white/70 select-none tabular-nums transition-colors hover:bg-[#A855F7]/5 hover:border-[#A855F7]/25"
              >
                <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-white/40" strokeWidth={1.5} />
                {time} IST
              </button>
              {reminderOpen && <ReminderPanel onClose={() => setReminderOpen(false)} />}
            </div>
          )}

          {/* Theme toggle — teacher workspace only, applies across every teacher page.
              Commented out for now per request — re-enable by uncommenting below. */}
          {/* {isTeacher && (
            <ThemeTogglePill theme={theme} onToggle={toggleTheme} />
          )} */}

          {/* Date chip / calendar trigger — redundant with the principal dashboard's own Command Centre date, and with the accountant dashboard's combined pill above */}
          {!isPrincipalDashboard && !isPrincipal && !isAccountantDashboard && (
          <div className="relative">
            {usePillTopbar ? (
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="hidden md:flex items-center gap-1.5 h-8.5 px-3.5 rounded-full bg-white dark:bg-white/5 border border-[#E8E8E8] dark:border-white/10 text-[12px] font-medium text-gray-500 dark:text-white/60 select-none transition-colors hover:bg-[#A855F7]/5 hover:border-[#A855F7]/25"
              >
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          )}

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar — teacher taps through straight to their profile */}
          <button
            onClick={isTeacher ? () => navigate('/teacher/profile') : undefined}
            className={cn(
              "ml-0.5 flex items-center gap-1.5 p-1 rounded-full transition-all duration-200",
              usePillTopbar
                ? "bg-white dark:bg-white/5 border border-[#E8E8E8] dark:border-white/10 hover:bg-[#A855F7]/5 hover:border-[#A855F7]/20 shadow-sm"
                : "hover:bg-gray-100"
            )}
            aria-label="Profile"
          >
            {usePillTopbar ? (
              <span className="w-7 h-7 rounded-full bg-[#A855F7]/10 dark:bg-[#A855F7]/20 border border-[#A855F7]/20 dark:border-[#A855F7]/30 flex items-center justify-center text-[11px] font-bold text-[#5B21B6] dark:text-violet-300">
                {initials}
              </span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">{initials}</span>
              </span>
            )}
            {!isTeacher && <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block mr-1" />}
          </button>
        </div>
      </div>
    </header>
  );
};
