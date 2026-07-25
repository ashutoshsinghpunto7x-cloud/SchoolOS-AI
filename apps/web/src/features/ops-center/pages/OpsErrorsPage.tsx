import { Loader2 } from 'lucide-react';
import { useOpsErrors } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsErrorEvent, ErrorEventSeverity } from '../api/opsApi';
import type { OpsStatus } from '../theme';

const SEVERITY_TO_STATUS: Record<ErrorEventSeverity, OpsStatus> = {
  critical: 'critical',
  high: 'critical',
  medium: 'warning',
  low: 'muted',
};

function ErrorRow({ event }: { event: OpsErrorEvent }) {
  return (
    <div className="border-b border-[#232D38] px-4 py-3 last:border-0 hover:bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-[#64748B]">{new Date(event.createdAt).toLocaleString()}</span>
        <StatusBadge status={SEVERITY_TO_STATUS[event.severity]} label={`${event.statusCode} ${event.code}`} />
        {event.method && event.path && (
          <span className="font-mono text-xs text-[#98A2B3]">
            {event.method} {event.path}
          </span>
        )}
        {event.schoolId && <span className="text-xs text-[#64748B]">{event.schoolId}</span>}
        {event.userId && <span className="text-xs text-[#64748B]">{event.userId} ({event.role})</span>}
      </div>
      <div className="mt-1.5 text-sm text-[#F4F6F8]">{event.message}</div>
      {event.stack && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-[#3B82F6]">Stack trace</summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-black/30 p-3 font-mono text-xs text-[#98A2B3]">{event.stack}</pre>
        </details>
      )}
    </div>
  );
}

export function OpsErrorsPage() {
  const { data, isLoading, isError } = useOpsErrors();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load error data.</div>;
  }

  const { summary, events } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Error Monitoring</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Real API errors from this server process — validation, not-found, conflicts, and unhandled exceptions.
          Auth failures (401/403) live in Security Center instead. Single-instance, in-memory (resets on restart).
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Last 24 Hours</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="Total Errors" value={summary.total} />
          <MetricCard
            label="Server Errors (5xx)"
            value={summary.serverErrors}
            accent={summary.serverErrors > 0 ? '#EF4444' : undefined}
          />
          <MetricCard
            label="Conflicts (409)"
            value={summary.conflictErrors}
            accent={summary.conflictErrors > 0 ? '#F59E0B' : undefined}
          />
          <MetricCard label="Validation (400)" value={summary.validationErrors} />
          <MetricCard label="Not Found (404)" value={summary.notFoundErrors} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Recent Errors</h2>
        <div className="rounded-2xl border border-[#232D38] bg-[#121922]">
          {events.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B]">No errors recorded yet.</div>
          ) : (
            events.map((event) => <ErrorRow key={event.id} event={event} />)
          )}
        </div>
      </section>
    </div>
  );
}
