import { Loader2 } from 'lucide-react';
import { useOpsDeployments } from '../hooks/useOpsData';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsDeploy } from '../api/opsApi';
import type { OpsStatus } from '../theme';

function statusFor(status: string): OpsStatus {
  if (status === 'live') return 'healthy';
  if (status === 'build_failed' || status === 'update_failed' || status === 'canceled') return 'critical';
  if (status === 'deactivated') return 'muted';
  return 'info';
}

function formatDuration(startedAt?: string, finishedAt?: string): string {
  if (!startedAt || !finishedAt) return '—';
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return `${Math.round(ms / 1000)}s`;
}

const COLUMNS: DataTableColumn<OpsDeploy>[] = [
  { key: 'status', header: 'Status', render: (d) => <StatusBadge status={statusFor(d.status)} label={d.status} /> },
  { key: 'commit', header: 'Commit', render: (d) => <span className="font-mono text-xs">{d.commitId?.slice(0, 7) ?? '—'}</span> },
  { key: 'message', header: 'Message', render: (d) => d.commitMessage ?? '—' },
  { key: 'trigger', header: 'Trigger', render: (d) => d.trigger },
  { key: 'duration', header: 'Duration', render: (d) => formatDuration(d.startedAt, d.finishedAt), align: 'right' },
  { key: 'when', header: 'Deployed', render: (d) => new Date(d.createdAt).toLocaleString() },
];

export function OpsDeploymentsPage() {
  const { data, isLoading, isError } = useOpsDeployments();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load deployment history.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Deployments</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">Real deploy history from Render — commit, status, and duration.</p>
      </div>

      {!data.available ? (
        <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4 text-sm text-[#F59E0B]">
          Render API not reachable: {data.reason}
        </div>
      ) : (
        <DataTable columns={COLUMNS} rows={data.deploys} rowKey={(d) => d.id} emptyMessage="No deploys found." />
      )}
    </div>
  );
}
