import { AlertTriangle, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanAlerts, useResolvePlanAlert } from '../hooks/useAcademicPlan';
import type { PlanAlert, PlanAlertSeverity } from '@schoolos/types';

const SEVERITY_META: Record<PlanAlertSeverity, { icon: typeof AlertTriangle; bg: string; text: string; border: string }> = {
  critical: { icon: AlertTriangle, bg: 'bg-red-50', text: 'text-[#A6432E]', border: 'border-red-100' },
  warning:  { icon: AlertCircle,   bg: 'bg-amber-50', text: 'text-[#B5741C]', border: 'border-amber-100' },
  info:     { icon: Info,          bg: 'bg-blue-50', text: 'text-[#3A5FA6]', border: 'border-blue-100' },
};

function AlertRow({ alert }: { alert: PlanAlert }) {
  const resolve = useResolvePlanAlert();
  const meta = SEVERITY_META[alert.severity];
  const Icon = meta.icon;
  const scope = [alert.class && `Class ${alert.class}${alert.section ? `-${alert.section}` : ''}`, alert.subject].filter(Boolean).join(' · ');

  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border p-4', meta.bg, meta.border)}>
      <Icon className={cn('w-4.5 h-4.5 shrink-0 mt-0.5', meta.text)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{alert.teacherName}{scope ? ` · ${scope}` : ''}</p>
        <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
      </div>
      <button
        type="button"
        disabled={resolve.isPending}
        onClick={() => resolve.mutate(alert._id)}
        title="Dismiss"
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/60 hover:text-gray-600 disabled:opacity-50"
      >
        {resolve.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/** Renders the school's open PlanAlert list — same data whether it's shown
 *  on the Principal or Coordinator dashboard, since both roles can view and
 *  dismiss alerts (see academic-plan.routes.ts's canViewPrincipalPlan gate). */
export function PlanAlertList({ limit }: { limit?: number }) {
  const { data: alerts, isLoading } = usePlanAlerts();
  const shown = limit ? (alerts ?? []).slice(0, limit) : alerts ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-16 rounded-2xl bg-gray-50 animate-pulse" />
        <div className="h-16 rounded-2xl bg-gray-50 animate-pulse" />
      </div>
    );
  }

  if (shown.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
        <p className="text-sm font-semibold text-gray-600">No open alerts — every plan is on track.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {shown.map((alert) => <AlertRow key={alert._id} alert={alert} />)}
    </div>
  );
}
