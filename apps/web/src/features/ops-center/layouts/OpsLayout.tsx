import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useState, useEffect } from 'react';
import { Loader2, Menu, Headphones } from 'lucide-react';
import { OpsSidebar } from '../components/OpsSidebar';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { SUPPORT_PHONE } from '@/lib/support';

export function OpsLayout() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F14] text-[#F4F6F8]">
      <OpsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[#232D38] px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="shrink-0 rounded-md p-1.5 text-[#98A2B3] hover:text-[#F4F6F8] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="truncate text-xs text-[#98A2B3] sm:text-sm">
              <span className="hidden sm:inline">
                All Systems Operational <span className="mx-2 text-[#232D38]">|</span>
              </span>
              <span className="sm:hidden">Operational</span>
              <span className="hidden md:inline"> Last updated just now</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {user && (
              <span className="hidden text-sm text-[#98A2B3] md:inline">
                {user.firstName} {user.lastName}
                <span className="ml-2 rounded border border-[#232D38] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#64748B]">
                  {user.role}
                </span>
              </span>
            )}
            <button
              onClick={() => { window.location.href = `tel:${SUPPORT_PHONE}`; }}
              title={`Contact Support: ${SUPPORT_PHONE}`}
              className="flex items-center gap-1.5 rounded-md border border-[#232D38] px-2 py-1.5 text-xs text-[#98A2B3] transition-colors hover:text-[#F4F6F8] sm:px-3"
            >
              <Headphones className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Contact Support</span>
            </button>
            <button
              onClick={() => setShowChangePassword(true)}
              className="rounded-md border border-[#232D38] px-2 py-1.5 text-xs text-[#98A2B3] transition-colors hover:text-[#F4F6F8] sm:px-3"
            >
              <span className="hidden sm:inline">Change Password</span>
              <span className="sm:hidden">Password</span>
            </button>
            <button
              onClick={() => logout()}
              className="rounded-md border border-[#232D38] px-2 py-1.5 text-xs text-[#98A2B3] transition-colors hover:text-[#F4F6F8] sm:px-3"
            >
              Sign out
            </button>
          </div>
        </header>
        {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center py-24">
                <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
