import { CheckCircle2, Loader2, X, AlertTriangle } from 'lucide-react';
import { backgroundJobs, useBackgroundJobs, useViewingJobId } from '@/lib/backgroundJobs';

// Floating status for AI work that is running (or finished) while the person
// is on another screen. Hidden for a job whose review modal is currently open.
export function BackgroundJobsTray() {
  const jobs = useBackgroundJobs();
  const viewingId = useViewingJobId();
  const visible = jobs.filter((j) => !j.dismissed && j.id !== viewingId && !backgroundJobs.isHeld(j.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed left-3 right-3 bottom-20 lg:left-auto lg:right-4 lg:bottom-4 lg:w-80 z-40 space-y-2 pointer-events-none">
      {visible.map((j) => (
        <div
          key={j.id}
          className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-white dark:bg-[#1A1230] shadow-lg border border-gray-100 dark:border-white/10 px-3 py-2.5"
        >
          {j.status === 'running' && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-violet-600" />}
          {j.status === 'done' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />}
          {j.status === 'failed' && <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{j.label}</p>
            <p className="text-[11px] text-gray-500 dark:text-white/50 truncate">
              {j.status === 'running' ? 'Working in the background…' : j.status === 'done' ? 'Ready' : (j.error ?? 'Failed')}
            </p>
          </div>
          {j.status === 'done' && j.onOpen && (
            <button
              type="button"
              onClick={() => backgroundJobs.open(j.id)}
              className="h-8 px-3 rounded-lg bg-violet-600 text-white text-xs font-bold shrink-0"
            >
              {j.openLabel}
            </button>
          )}
          {j.status !== 'running' && (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => backgroundJobs.dismiss(j.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 shrink-0"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
