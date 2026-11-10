import { Suspense, useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Topbar } from '@/components/topbar/Topbar';
import { AccountantTopNav } from '@/features/accountant-workspace/components/AccountantTopNav';
import { NotificationNudge } from '@/features/notifications/components/NotificationNudge';
import { ReminderWatcher } from '@/features/reminders/components/ReminderWatcher';
import { HighPriorityMessageGate } from '@/features/internal-messages/components/HighPriorityMessageGate';
import { TeacherThemeProvider, useTeacherTheme } from '@/features/teacher-workspace/context/TeacherThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useModuleAccessStatus } from '@/features/ops-center/hooks/useModuleAccess';
import { getActiveRestriction } from '@/lib/moduleAccess';
import { ModuleRestrictedNotice } from '@/components/ModuleRestrictedNotice';

// Inner layout — rendered inside TeacherThemeProvider so it can read the theme
function AppLayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isTeacher = user?.role === 'teacher';
  const isPrincipal = user?.role === 'principal' || user?.role === 'incharge';
  // Parent Workspace ships its own full-bleed shell (ParentLayout: header +
  // bottom nav) — same treatment as the teacher portal above.
  const isParentWorkspace = user?.role === 'parent';
  // Driver Dashboard is a single full-bleed mobile page (big Start/End Route
  // button) — same "no sidebar/topbar chrome" treatment as teacher/parent/accountant.
  const isDriver = user?.role === 'driver';
  const mainRef = useRef<HTMLElement>(null);
  const activePage = searchParams.get('page') || (location.pathname === '/principal' ? 'home' : location.pathname);

  // Read the shared theme — safe because this component is always wrapped in
  // TeacherThemeProvider (see AppLayout below); it applies the `.dark` class
  // app-wide (not just to teacher pages) so Principal's own theme toggle in
  // Settings also flips it here.
  const { theme } = useTeacherTheme();
  const isDark = theme === 'dark';

  // Ops Center > Module Access — if the current page's module is currently
  // restricted, swap only the page content for a notice; sidebar/topbar and
  // every other module stay exactly as they were.
  const { data: moduleRestrictedStatus } = useModuleAccessStatus();
  const activeRestriction = getActiveRestriction(location.pathname, moduleRestrictedStatus);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // `main` (not window) is the actual scroll container here, and React Router
  // never resets its scrollTop on navigation — so leaving a page scrolled down
  // and opening a new one left that new page's header off-screen until the
  // user manually scrolled back up.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Open sidebar by default on desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className={cn(
      "flex h-screen overflow-hidden",
      isAccountant || isDriver
        ? "bg-white"
        : isDark
          ? (isTeacher ? "teacher-aurora-bg" : "bg-[#0B0C12]")
          : (isTeacher ? "bg-[#F5F5F7]" : "bg-[#FBF8F3]")
    )}>
      <NotificationNudge />
      <ReminderWatcher />
      <HighPriorityMessageGate />

      {/* Backdrop — mobile-only, since the sidebar is permanently docked on desktop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — Principal, teacher portal, Parent Workspace, and Accountant have no left
          sidebar; Principal uses the topbar 9-dot launcher on desktop and capsule dock on mobile. */}
      {!isPrincipal && !isTeacher && !isParentWorkspace && !isAccountant && !isDriver && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content — offset by sidebar on desktop (not for principal/teacher/parent/accountant/driver, whose sidebar doesn't apply). */}
      <div className={cn(
        'flex flex-1 flex-col min-h-0 min-w-0',
        !isPrincipal && !isTeacher && !isParentWorkspace && !isAccountant && !isDriver && 'lg:ml-[260px]'
      )}>
        {!isParentWorkspace && !isAccountant && !isDriver && (
          <Topbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        )}
        {isAccountant && <AccountantTopNav />}

        <main ref={mainRef} className="flex-1 overflow-y-auto flex flex-col">
          {activeRestriction ? (
            <ModuleRestrictedNotice restriction={activeRestriction} />
          ) : (
            <Suspense fallback={
              <div className="flex flex-1 items-center justify-center py-24">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
              </div>
            }>
              <Outlet />
            </Suspense>
          )}
        </main>

        {/* Mobile Sticky Bottom Capsule Dock — Principal only */}
        {isPrincipal && (
          <footer className="flex md:hidden shrink-0 bg-[#FBF8F3] items-center px-3 pb-2.5 pt-1 font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
            <nav className="w-full bg-[#1B2A4E] rounded-[22px] px-2 py-1.5 flex items-center justify-around shadow-[0_8px_24px_rgba(27,42,78,0.3)] border border-white/10">
              {/* 1. Home */}
              <button
                type="button"
                onClick={() => navigate('/principal')}
                aria-label="Home"
                className={cn(
                  'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
                  activePage === 'home' ? 'bg-[#2C4177]' : 'text-white/80 hover:text-white'
                )}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F6F1E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11l8-7 8 7v9H4zM10 20v-5h4v5" />
                </svg>
              </button>

              {/* 2. Approvals */}
              <button
                type="button"
                onClick={() => navigate('/principal?page=leave_approvals')}
                aria-label="Approvals"
                className={cn(
                  'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
                  activePage.includes('leave') || activePage.includes('approv')
                    ? 'bg-[#2C4177]'
                    : 'text-white/80 hover:text-white'
                )}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F6F1E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6zM9 12l2 2 4-4" />
                </svg>
              </button>

              {/* 3. Academics */}
              <button
                type="button"
                onClick={() => navigate('/principal?page=academic_plan')}
                aria-label="Academics"
                className={cn(
                  'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
                  activePage.includes('academic') || activePage.includes('plan') || activePage.includes('question') || activePage.includes('calendar')
                    ? 'bg-[#2C4177]'
                    : 'text-white/80 hover:text-white'
                )}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F6F1E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1zM12 6v13" />
                </svg>
              </button>

              {/* 4. Results */}
              <button
                type="button"
                onClick={() => navigate('/principal?page=marks_hub')}
                aria-label="Results"
                className={cn(
                  'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
                  activePage.includes('mark') || activePage.includes('exam')
                    ? 'bg-[#2C4177]'
                    : 'text-white/80 hover:text-white'
                )}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F6F1E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a5 5 0 100 10 5 5 0 000-10zM9 12l-2 9 5-3 5 3-2-9" />
                </svg>
              </button>

              {/* 5. Timetables */}
              <button
                type="button"
                onClick={() => navigate('/principal?page=school_timetable')}
                aria-label="Timetables"
                className={cn(
                  'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
                  activePage.includes('timetable') || activePage.includes('attendance') || activePage.includes('transport') || activePage.includes('message')
                    ? 'bg-[#2C4177]'
                    : 'text-white/80 hover:text-white'
                )}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F6F1E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" />
                </svg>
              </button>

              {/* 6. People */}
              <button
                type="button"
                onClick={() => navigate('/principal?page=teachers')}
                aria-label="People"
                className={cn(
                  'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
                  activePage.includes('teacher')
                    ? 'bg-[#2C4177]'
                    : 'text-white/80 hover:text-white'
                )}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F6F1E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11a3 3 0 100-6 3 3 0 000 6zM3 19c0-3 2.5-5 6-5s6 2 6 5M16 8a2.5 2.5 0 010 5M17 14c2 .5 4 2 4 5" />
                </svg>
              </button>

              {/* 7. Overview */}
              <button
                type="button"
                onClick={() => navigate('/principal?page=dashboard')}
                aria-label="Overview"
                className={cn(
                  'flex-1 max-w-[48px] h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer',
                  activePage.includes('dashboard') || activePage.includes('front') || activePage.includes('recruit')
                    ? 'bg-[#2C4177]'
                    : 'text-white/80 hover:text-white'
                )}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F6F1E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16M7 20v-6M12 20V6M17 20v-9" />
                </svg>
              </button>
            </nav>
          </footer>
        )}
      </div>
    </div>
  );
}

// Dark mode is scoped to the teacher workspace only — the `dark` class is applied
// by TeacherThemeProvider's wrapper div, so no other role is ever affected.
// We always render TeacherThemeProvider (not just for teachers) so AppLayoutInner
// can safely call useTeacherTheme() — the hook returns light/no-op for other roles.
export const AppLayout = () => (
  <TeacherThemeProvider>
    <LanguageProvider>
      <AppLayoutInner />
    </LanguageProvider>
  </TeacherThemeProvider>
);
