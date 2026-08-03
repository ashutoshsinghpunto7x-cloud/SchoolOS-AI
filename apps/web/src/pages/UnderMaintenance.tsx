import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useMaintenanceStatus } from '@/features/ops-center/hooks/useMaintenance';
import { cn } from '@/lib/utils';

// Public, unauthenticated page — reached either from LoginPage (after a 503
// MAINTENANCE_MODE login attempt) or from ProtectedRoute redirecting a tab
// whose session was already open when maintenance was toggled on. Polls the
// same public status endpoint and bounces back to /login the moment
// maintenance clears, so a waiting user doesn't have to keep retrying.
export const UnderMaintenance = () => {
  const navigate = useNavigate();
  const { data: status, isLoading } = useMaintenanceStatus();

  useEffect(() => {
    if (!isLoading && status && !status.isActive) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 ring-2 ring-orange-500/40">
          <Wrench className="h-7 w-7 text-orange-500" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Under Maintenance</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {status?.message || "SchoolOS is undergoing scheduled maintenance. Please check back shortly."}
          </p>
        </div>

        {status?.scheduledEndAt && (
          <div className="rounded-xl border border-white/[0.08] bg-[#0E0E0E] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Expected back online</p>
            <p className="mt-1 text-sm font-medium text-white">{new Date(status.scheduledEndAt).toLocaleString()}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <span className={cn('h-1.5 w-1.5 rounded-full', 'animate-pulse bg-orange-500')} />
          Checking automatically — this page will move on once we're back.
        </div>
      </div>
    </div>
  );
};

export default UnderMaintenance;
