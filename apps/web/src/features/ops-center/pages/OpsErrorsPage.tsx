import { Loader2 } from 'lucide-react';
import { useOpsErrors, useOpsErrorsByModule } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsErrorEvent, ErrorEventSeverity, OpsErrorModuleBreakdown, RootCauseCategory } from '../api/opsApi';
import type { OpsStatus } from '../theme';

const SEVERITY_TO_STATUS: Record<ErrorEventSeverity, OpsStatus> = {
  critical: 'critical',
  high: 'critical',
  medium: 'warning',
  low: 'muted',
};

const CATEGORY_LABEL: Record<RootCauseCategory, string> = {
  database: 'Database', authentication: 'Authentication', authorization: 'Authorization',
  validation: 'Validation', frontend: 'Frontend', network: 'Network', rate_limiting: 'Rate Limiter',
  mongodb: 'MongoDB', jwt: 'JWT', external_api: 'External API', n8n: 'n8n',
  memory_leak: 'Memory Leak', race_condition: 'Race Condition', unknown: 'Unknown',
};

const STATUS_COLOR = (code: number): string => {
  if (code >= 500) return '#EF4444';
  if (code === 429) return '#F59E0B';
  if (code >= 400) return '#F59E0B';
  return '#22C55E';
};

function ModuleCard({ m }: { m: OpsErrorModuleBreakdown }) {
  const statusCodes = m.statusCodes ?? {};
  const codes = Object.entries(statusCodes).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize text-[#F4F6F8]">{m.feature}</h3>
        <span className="text-xs text-[#64748B]">last seen {new Date(m.lastSeenAt).toLocaleTimeString()}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-[#98A2B3]">Requests</div>
          <div className="text-lg font-semibold text-[#F4F6F8]">{m.requests}</div>
        </div>
        <div>
          <div className="text-xs text-[#98A2B3]">Success</div>
          <div className="text-lg font-semibold text-[#22C55E]">{m.successCount}</div>
        </div>
        <div>
          <div className="text-xs text-[#98A2B3]">Failures</div>
          <div className="text-lg font-semibold" style={{ color: m.errors > 0 ? '#EF4444' : '#F4F6F8' }}>
            {m.errors}
          </div>
        </div>
      </div>

      {codes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {codes.map(([code, count]) => (
            <span
              key={code}
              className="rounded-md border px-2 py-0.5 text-xs font-mono"
              style={{ color: STATUS_COLOR(Number(code)), borderColor: `${STATUS_COLOR(Number(code))}40`, backgroundColor: `${STATUS_COLOR(Number(code))}1A` }}
            >
              {code} · {count}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#232D38] pt-3">
        <div>
          <div className="text-xs text-[#98A2B3]">Average</div>
          <div className="text-sm text-[#F4F6F8]">{m.avgResponseTimeMs}ms</div>
        </div>
        <div>
          <div className="text-xs text-[#98A2B3]">P95</div>
          <div className="text-sm text-[#F4F6F8]">{m.p95ResponseTimeMs ?? 0}ms</div>
        </div>
        <div>
          <div className="text-xs text-[#98A2B3]">P99</div>
          <div className="text-sm text-[#F4F6F8]">{m.p99ResponseTimeMs ?? 0}ms</div>
        </div>
      </div>

      {m.lastError && (
        <div className="mt-4 rounded-xl border border-[#232D38] bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={m.lastError.statusCode >= 500 ? 'critical' : 'warning'} label={`${m.lastError.statusCode} ${m.lastError.code}`} />
            <span className="text-xs text-[#64748B]">{new Date(m.lastError.lastSeenAt).toLocaleString()}</span>
          </div>
          <div className="mt-1.5 text-sm text-[#F4F6F8]">{m.lastError.message}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <div className="text-[#64748B]">Root Cause</div>
              <div className="text-[#F4F6F8]">{CATEGORY_LABEL[m.lastError.category]}</div>
            </div>
            <div>
              <div className="text-[#64748B]">Confidence</div>
              <div className="text-[#F4F6F8]">{m.lastError.confidencePercent}%</div>
            </div>
            <div>
              <div className="text-[#64748B]">Affected Role</div>
              <div className="text-[#F4F6F8]">{m.lastError.affectedRole ?? '—'}</div>
            </div>
          </div>
          <div className="mt-2 text-xs">
            <div className="text-[#64748B]">Fix Recommendation</div>
            <div className="text-[#F4F6F8]">{m.lastError.recommendedFix}</div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const { data: moduleData } = useOpsErrorsByModule();

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

      {moduleData && moduleData.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Per-Module Breakdown</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {moduleData.map((m) => (
              <ModuleCard key={m.feature} m={m} />
            ))}
          </div>
        </section>
      )}

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
