import { Loader2 } from 'lucide-react';
import { useOpsDashboard } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import type { OpsAuditLogEntry } from '../api/opsApi';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const ACTIVITY_COLUMNS: DataTableColumn<OpsAuditLogEntry>[] = [
  { key: 'time', header: 'Time', render: (r) => new Date(r.createdAt).toLocaleTimeString() },
  { key: 'user', header: 'User', render: (r) => r.userDisplayName },
  { key: 'action', header: 'Action', render: (r) => <span className="font-mono text-xs">{r.action}</span> },
  { key: 'resource', header: 'Resource', render: (r) => r.resource },
  { key: 'school', header: 'School', render: (r) => r.schoolId },
];

export function OpsDashboardPage() {
  const { data, isLoading, isError } = useOpsDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load dashboard data.</div>;
  }

  const { totals, infrastructure, recentActivity } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Dashboard Overview</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={infrastructure.database.healthy ? 'healthy' : 'critical'} label="Database" />
          <StatusBadge status="healthy" label="API" />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Platform Totals</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Schools" value={totals.schoolCount} />
          <MetricCard label="Students" value={totals.studentTotal.toLocaleString()} />
          <MetricCard label="Teachers" value={totals.teacherTotal.toLocaleString()} />
          <MetricCard label="Internal Staff Active (15m)" value={totals.internalActiveUsers} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Infrastructure</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Requests / min" value={infrastructure.requestsPerMinute} />
          <MetricCard
            label="Error Rate"
            value={`${infrastructure.errorRatePercent}%`}
            accent={infrastructure.errorRatePercent > 5 ? '#EF4444' : undefined}
          />
          <MetricCard label="Avg Response Time" value={`${infrastructure.avgResponseTimeMs} ms`} />
          <MetricCard label="Process Uptime" value={formatUptime(infrastructure.uptimeSeconds)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Recent Activity</h2>
        <DataTable
          columns={ACTIVITY_COLUMNS}
          rows={recentActivity}
          rowKey={(r) => r._id}
          emptyMessage="No recent activity."
        />
      </section>
    </div>
  );
}
