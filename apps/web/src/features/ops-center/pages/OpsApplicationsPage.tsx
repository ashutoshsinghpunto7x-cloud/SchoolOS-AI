import { Loader2 } from 'lucide-react';
import { useOpsApplications } from '../hooks/useOpsData';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsFeatureHealth } from '../api/opsApi';
import type { OpsStatus } from '../theme';

function statusFor(f: OpsFeatureHealth): OpsStatus {
  if (f.errorRatePercent >= 20) return 'critical';
  if (f.errorRatePercent >= 5) return 'warning';
  return 'healthy';
}

const COLUMNS: DataTableColumn<OpsFeatureHealth>[] = [
  { key: 'feature', header: 'Feature', render: (f) => <span className="font-medium">{f.feature}</span> },
  { key: 'status', header: 'Status', render: (f) => <StatusBadge status={statusFor(f)} /> },
  { key: 'requests', header: 'Requests', render: (f) => f.requests.toLocaleString(), align: 'right' },
  {
    key: 'errorRate',
    header: 'Error Rate',
    render: (f) => `${f.errorRatePercent}%`,
    align: 'right',
  },
  { key: 'latency', header: 'Avg Latency', render: (f) => `${f.avgResponseTimeMs} ms`, align: 'right' },
  { key: 'lastSeen', header: 'Last Request', render: (f) => new Date(f.lastSeenAt).toLocaleString() },
];

export function OpsApplicationsPage() {
  const { data, isLoading, isError } = useOpsApplications();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load application health.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Applications</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Real request/error counts per feature, grouped by API route — cumulative since this server process
          started. This is a monolith, not separate microservices, so this reflects one backend's routes, not
          independently deployed services.
        </p>
      </div>
      <DataTable
        columns={COLUMNS}
        rows={data}
        rowKey={(f) => f.feature}
        emptyMessage="No requests recorded yet since server start."
      />
    </div>
  );
}
