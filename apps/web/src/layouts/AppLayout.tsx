import { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Topbar } from '@/components/topbar/Topbar';
import { NotificationNudge } from '@/features/notifications/components/NotificationNudge';
import { ReminderWatcher } from '@/features/reminders/components/ReminderWatcher';
import { HighPriorityMessageGate } from '@/features/internal-messages/components/HighPriorityMessageGate';
import { TeacherThemeProvider, useTeacherTheme } from '@/features/teacher-workspace/context/TeacherThemeContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Inner layout — rendered inside TeacherThemeProvider so it can read the theme
function AppLayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Accountant-only: fully collapses the sidebar on desktop for more page
  // width. Separate from `sidebarOpen` (which drives the mobile overlay) so
  // toggling one never affects the other.
  const [accountantSidebarCollapsed, setAccountantSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isTeacher = user?.role === 'teacher';

  // Read the shared theme — safe because this component is always wrapped in
  // TeacherThemeProvider (see AppLayout below); it applies the `.dark` class
  // app-wide (not just to teacher pages) so Principal's own theme toggle in
  // Settings also flips it here.
  const { theme } = useTeacherTheme();
  const isDark = theme === 'dark';

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
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

      {/* Sidebar — teacher portal has no sidebar; bottom nav + profile cover its role */}
      {!isTeacher && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          forceHiddenOnDesktop={isAccountant && accountantSidebarCollapsed}
        />
      )}

      {/* Main content — offset by sidebar on desktop (not for teacher, whose sidebar doesn't apply; not for accountant while manually collapsed) */}
      <div className={cn(
        'flex flex-1 flex-col min-h-screen overflow-hidden',
        !isTeacher && !(isAccountant && accountantSidebarCollapsed) && 'lg:ml-[260px]'
      )}>
        <Topbar
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
          showDesktopCollapseToggle={isAccountant}
          desktopCollapsed={accountantSidebarCollapsed}
          onToggleDesktopCollapse={() => setAccountantSidebarCollapsed((v) => !v)}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          <Suspense fallback={
            <div className="flex flex-1 items-center justify-center py-24">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
            </div>
          }>
            <Outlet />
          </Suspense>
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
    <AppLayoutInner />
  </TeacherThemeProvider>
);
