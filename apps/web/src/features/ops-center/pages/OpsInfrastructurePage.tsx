import { Loader2 } from 'lucide-react';
import { useOpsInfrastructure } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function OpsInfrastructurePage() {
  const { data, isLoading, isError } = useOpsInfrastructure();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load infrastructure data.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Infrastructure</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Live process metrics for the API server — polled every 10s. Single-instance gauge, not distributed.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Server Process</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Uptime" value={formatUptime(data.uptimeSeconds)} />
          <MetricCard label="Heap Used" value={formatBytes(data.memory.heapUsedBytes)} sublabel={`of ${formatBytes(data.memory.heapTotalBytes)} heap total`} />
          <MetricCard label="RSS Memory" value={formatBytes(data.memory.rssBytes)} />
          <MetricCard label="CPU Cores" value={data.cpuCount} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Load Average</h2>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="1 min" value={data.loadAverage[0]?.toFixed(2) ?? '—'} />
          <MetricCard label="5 min" value={data.loadAverage[1]?.toFixed(2) ?? '—'} />
          <MetricCard label="15 min" value={data.loadAverage[2]?.toFixed(2) ?? '—'} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Database</h2>
        <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4">
          <StatusBadge status={data.database.healthy ? 'healthy' : 'critical'} label={`MongoDB — ${data.database.status}`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Traffic (last 60s)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard label="Requests / min" value={data.requestsPerMinute} />
          <MetricCard
            label="Error Rate"
            value={`${data.errorRatePercent}%`}
            accent={data.errorRatePercent > 5 ? '#EF4444' : undefined}
          />
          <MetricCard label="Avg Response Time" value={`${data.avgResponseTimeMs} ms`} />
        </div>
      </section>
    </div>
  );
}
