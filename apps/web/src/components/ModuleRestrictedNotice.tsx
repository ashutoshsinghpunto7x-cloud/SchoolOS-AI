import { Wrench } from 'lucide-react';
import type { ActiveRestriction } from '@/lib/moduleAccess';

// Rendered in place of a restricted module's page content — sidebar/topbar
// stay exactly as they were (per Ops Center "block only" behavior: the nav
// link stays visible, only the page itself is paused) so it's obvious this
// is a deliberate, temporary pause rather than something broken or missing.
export function ModuleRestrictedNotice({ restriction }: { restriction: ActiveRestriction }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 ring-2 ring-orange-500/30">
          <Wrench className="h-6 w-6 text-orange-500" />
        </div>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">{restriction.moduleLabel} is temporarily unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">
            {restriction.message || 'This section has been paused for maintenance. Please check back shortly.'}
          </p>
        </div>

        {restriction.showReturnTime && restriction.returnAt && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Expected back</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{new Date(restriction.returnAt).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
