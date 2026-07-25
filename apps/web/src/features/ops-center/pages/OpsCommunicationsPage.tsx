import { Loader2 } from 'lucide-react';
import { useOpsCommunications } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { OpsWhatsAppMessage } from '../api/opsApi';
import type { OpsStatus } from '../theme';

function statusFor(status: string): OpsStatus {
  if (['COMPLETED', 'DELIVERED', 'READ'].includes(status)) return 'healthy';
  if (status === 'FAILED' || status === 'CANCELLED') return 'critical';
  return 'warning';
}

const COLUMNS: DataTableColumn<OpsWhatsAppMessage>[] = [
  { key: 'time', header: 'Time', render: (r) => new Date(r.createdAt).toLocaleString() },
  { key: 'title', header: 'Message', render: (r) => r.title },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={statusFor(r.status)} label={r.status} /> },
  { key: 'provider', header: 'Provider', render: (r) => r.provider },
  { key: 'school', header: 'School', render: (r) => r.schoolId },
];

export function OpsCommunicationsPage() {
  const { data, isLoading, isError } = useOpsCommunications();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load communications data.</div>;
  }

  const statusEntries = Object.entries(data.whatsapp.last30dByStatus);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Communications</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">Real WhatsApp send status and in-app push read rate, last 30 days.</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">WhatsApp — Last 30 Days</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statusEntries.length === 0 ? (
            <MetricCard label="Messages Sent" value={0} />
          ) : (
            statusEntries.map(([status, count]) => (
              <MetricCard key={status} label={status} value={count} accent={status === 'FAILED' ? '#EF4444' : undefined} />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Push Notifications — Last 30 Days</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard label="Sent" value={data.pushNotifications.last30dSent} />
          <MetricCard label="Read" value={data.pushNotifications.last30dRead} />
          <MetricCard label="Read Rate" value={`${data.pushNotifications.readRatePercent}%`} />
        </div>
        <p className="mt-2 text-xs text-[#64748B]">{data.pushNotifications.note}</p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Recent WhatsApp Messages</h2>
        <DataTable
          columns={COLUMNS}
          rows={data.whatsapp.recent}
          rowKey={(r) => r._id}
          emptyMessage="No WhatsApp messages sent yet."
        />
      </section>
    </div>
  );
}
