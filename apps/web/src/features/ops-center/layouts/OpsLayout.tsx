import { Outlet } from 'react-router-dom';
import { Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OpsSidebar } from '../components/OpsSidebar';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function OpsLayout() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F14] text-[#F4F6F8]">
      <OpsSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#232D38] px-6">
          <div className="text-sm text-[#98A2B3]">
            All Systems Operational <span className="mx-2 text-[#232D38]">|</span> Last updated just now
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-[#98A2B3]">
                {user.firstName} {user.lastName}
                <span className="ml-2 rounded border border-[#232D38] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#64748B]">
                  {user.role}
                </span>
              </span>
            )}
            <button
              onClick={() => setShowChangePassword(true)}
              className="rounded-md border border-[#232D38] px-3 py-1.5 text-xs text-[#98A2B3] transition-colors hover:text-[#F4F6F8]"
            >
              Change Password
            </button>
            <button
              onClick={() => logout()}
              className="rounded-md border border-[#232D38] px-3 py-1.5 text-xs text-[#98A2B3] transition-colors hover:text-[#F4F6F8]"
            >
              Sign out
            </button>
          </div>
        </header>
        {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
        <main className="flex-1 overflow-y-auto p-6">
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
