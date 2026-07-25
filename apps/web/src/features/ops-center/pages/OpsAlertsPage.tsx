import { Loader2 } from 'lucide-react';
import { useOpsAlerts, useUpdateOpsAlert } from '../hooks/useOpsData';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsAlert } from '../api/opsApi';
import type { OpsStatus } from '../theme';

const SEVERITY_TO_STATUS: Record<OpsAlert['severity'], OpsStatus> = {
  critical: 'critical',
  warning: 'warning',
};

function AlertRow({ alert }: { alert: OpsAlert }) {
  const { mutate, isPending } = useUpdateOpsAlert();

  return (
    <div className="border-b border-[#232D38] px-4 py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={SEVERITY_TO_STATUS[alert.severity]} label={alert.severity} />
            <span className="font-medium text-[#F4F6F8]">{alert.title}</span>
          </div>
          <p className="mt-1 text-sm text-[#98A2B3]">{alert.message}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-[#64748B]">
            <span>
              Status: <span className="text-[#98A2B3]">{alert.status}</span>
            </span>
            {alert.updatedAt && <span>Last updated {new Date(alert.updatedAt).toLocaleString()}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {alert.status !== 'acknowledged' && (
            <button
              disabled={isPending}
              onClick={() => mutate({ alertKey: alert.alertKey, status: 'acknowledged' })}
              className="rounded-md border border-[#232D38] px-3 py-1.5 text-xs text-[#98A2B3] hover:text-[#F4F6F8] disabled:opacity-40"
            >
              Acknowledge
            </button>
          )}
          {alert.status !== 'resolved' && (
            <button
              disabled={isPending}
              onClick={() => mutate({ alertKey: alert.alertKey, status: 'resolved' })}
              className="rounded-md bg-[#22C55E]/10 border border-[#22C55E]/40 px-3 py-1.5 text-xs text-[#22C55E] hover:bg-[#22C55E]/20 disabled:opacity-40"
            >
              Resolve
            </button>
          )}
          {alert.status === 'resolved' && (
            <button
              disabled={isPending}
              onClick={() => mutate({ alertKey: alert.alertKey, status: 'open' })}
              className="rounded-md border border-[#232D38] px-3 py-1.5 text-xs text-[#98A2B3] hover:text-[#F4F6F8] disabled:opacity-40"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OpsAlertsPage() {
  const { data, isLoading, isError } = useOpsAlerts();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load alerts.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Alerts</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Real conditions computed live from the platform — server errors, security event spikes, database health,
          and low same-day attendance. Acknowledge/resolve state is persisted.
        </p>
      </div>

      <div className="rounded-2xl border border-[#232D38] bg-[#121922]">
        {data.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">
            No active alerts — all monitored conditions are within normal range.
          </div>
        ) : (
          data.map((alert) => <AlertRow key={alert.alertKey} alert={alert} />)
        )}
      </div>
    </div>
  );
}
