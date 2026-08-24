import { Suspense, useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isTeacher = user?.role === 'teacher';
  // Parent Workspace ships its own full-bleed shell (ParentLayout: header +
  // bottom nav) — same treatment as the teacher portal above.
  const isParentWorkspace = user?.role === 'parent';
  const mainRef = useRef<HTMLElement>(null);

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
      isAccountant
        ? "bg-white"
        : isDark
          ? (isTeacher ? "teacher-aurora-bg" : "bg-[#0B0C12]")
          : (isTeacher ? "bg-[#F5F5F7]" : "bg-white")
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

      {/* Sidebar — teacher portal, Parent Workspace, and Accountant have no left
          sidebar; teacher/parent cover navigation with their own bottom nav +
          header, and Accountant uses a top nav bar with dropdowns instead
          (see AccountantTopNav) so its dense pages get the full page width. */}
      {!isTeacher && !isParentWorkspace && !isAccountant && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content — offset by sidebar on desktop (not for teacher/parent/accountant, whose sidebar doesn't apply) */}
      <div className={cn(
        'flex flex-1 flex-col min-h-screen overflow-hidden',
        !isTeacher && !isParentWorkspace && !isAccountant && 'lg:ml-[260px]'
      )}>
        {/* Accountant gets one combined header (AccountantTopNav: nav boxes +
            clock/date/notifications/profile) instead of the generic Topbar
            stacked above it — the Topbar's breadcrumb only ever repeated
            "Accountant Workspace", which AccountantTopNav's own nav already
            makes obvious. */}
        {!isParentWorkspace && !isAccountant && (
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
