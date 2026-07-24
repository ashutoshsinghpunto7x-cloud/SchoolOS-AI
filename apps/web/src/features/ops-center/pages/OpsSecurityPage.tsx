import { Loader2 } from 'lucide-react';
import { useOpsSecurity } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import type { OpsSecurityEvent } from '../api/opsApi';
import { SEVERITY_TO_STATUS, SECURITY_TYPE_LABEL } from '../lib/securityEvent';

const COLUMNS: DataTableColumn<OpsSecurityEvent>[] = [
  { key: 'time', header: 'Time', render: (r) => new Date(r.createdAt).toLocaleTimeString() },
  {
    key: 'risk',
    header: 'Risk Level',
    render: (r) => <StatusBadge status={SEVERITY_TO_STATUS[r.severity]} label={r.severity} />,
  },
  { key: 'type', header: 'Type', render: (r) => SECURITY_TYPE_LABEL[r.type] },
  { key: 'source', header: 'Source (IP)', render: (r) => <span className="font-mono text-xs">{r.ip ?? '—'}</span> },
  { key: 'path', header: 'Path', render: (r) => <span className="font-mono text-xs">{r.path ?? '—'}</span> },
  { key: 'user', header: 'User / Role', render: (r) => (r.userId ? `${r.userId} (${r.role ?? '—'})` : '—') },
  { key: 'school', header: 'School', render: (r) => r.schoolId ?? '—' },
  { key: 'message', header: 'Detail', render: (r) => r.message },
];

export function OpsSecurityPage() {
  const { data, isLoading, isError } = useOpsSecurity();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load security data.</div>;
  }

  const { summary, events } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Security Center</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Real auth/access events from this server process — failed logins, invalid tokens, permission denials, and
          rate limiting. Single-instance, in-memory (resets on restart).
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Last 24 Hours</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Failed Logins"
            value={summary.failedLogins}
            accent={summary.failedLogins > 0 ? '#F59E0B' : undefined}
          />
          <MetricCard
            label="Invalid Tokens"
            value={summary.invalidTokens}
            accent={summary.invalidTokens > 0 ? '#EF4444' : undefined}
          />
          <MetricCard
            label="Permission Violations"
            value={summary.permissionViolations}
            accent={summary.permissionViolations > 0 ? '#F59E0B' : undefined}
          />
          <MetricCard
            label="Rate Limited"
            value={summary.rateLimited}
            accent={summary.rateLimited > 0 ? '#F59E0B' : undefined}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Recent Security Events</h2>
        <DataTable columns={COLUMNS} rows={events} rowKey={(r) => r.id} emptyMessage="No security events recorded yet." />
      </section>
    </div>
  );
}
