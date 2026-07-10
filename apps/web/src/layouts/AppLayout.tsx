import { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Topbar } from '@/components/topbar/Topbar';
import { NotificationNudge } from '@/features/notifications/components/NotificationNudge';
import { ReminderWatcher } from '@/features/reminders/components/ReminderWatcher';
import { HighPriorityMessageGate } from '@/features/internal-messages/components/HighPriorityMessageGate';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Accountant-only: fully collapses the sidebar on desktop for more page
  // width. Separate from `sidebarOpen` (which drives the mobile overlay) so
  // toggling one never affects the other.
  const [accountantSidebarCollapsed, setAccountantSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const isAccountant = user?.role === 'accountant';
  const isTeacher = user?.role === 'teacher';
  // Principal's sidebar is a pure overlay/drawer at every breakpoint — hidden
  // until the topbar menu icon is clicked, never permanently docked.
  const isPrincipal = user?.role === 'principal';

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
    <div className={cn("flex h-screen overflow-hidden", isAccountant || isPrincipal ? "bg-white" : "bg-[#F5F5F7]")}>
      <NotificationNudge />
      <ReminderWatcher />
      <HighPriorityMessageGate />

      {/* Backdrop — every breakpoint for principal (pure overlay sidebar), mobile-only for others */}
      {sidebarOpen && (
        <div
          className={cn('fixed inset-0 z-20 bg-black/20 backdrop-blur-sm', !isPrincipal && 'lg:hidden')}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — teacher portal has no sidebar; bottom nav + profile cover its role */}
      {!isTeacher && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          overlayOnDesktop={isPrincipal}
          forceHiddenOnDesktop={isAccountant && accountantSidebarCollapsed}
        />
      )}

      {/* Main content — offset by sidebar on desktop (not for teacher or principal, whose sidebars don't permanently dock; not for accountant while manually collapsed) */}
      <div className={cn(
        'flex flex-1 flex-col min-h-screen overflow-hidden',
        !isTeacher && !isPrincipal && !(isAccountant && accountantSidebarCollapsed) && 'lg:ml-[260px]'
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
};
