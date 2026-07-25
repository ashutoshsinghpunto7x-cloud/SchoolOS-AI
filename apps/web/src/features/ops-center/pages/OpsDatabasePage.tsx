import { Loader2 } from 'lucide-react';
import { useOpsDatabase } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, type DataTableColumn } from '../components/DataTable';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CollectionRow {
  name: string;
  count: number;
  storageSizeBytes: number;
  totalIndexSizeBytes: number;
  avgObjSizeBytes: number;
}

const COLUMNS: DataTableColumn<CollectionRow>[] = [
  { key: 'name', header: 'Collection', render: (r) => <span className="font-mono text-xs">{r.name}</span> },
  { key: 'count', header: 'Documents', render: (r) => r.count.toLocaleString(), align: 'right' },
  { key: 'storage', header: 'Storage', render: (r) => formatBytes(r.storageSizeBytes), align: 'right' },
  { key: 'index', header: 'Index Size', render: (r) => formatBytes(r.totalIndexSizeBytes), align: 'right' },
];

export function OpsDatabasePage() {
  const { data, isLoading, isError } = useOpsDatabase();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data || !data.connected) {
    return <div className="text-sm text-[#EF4444]">Database not connected.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Database</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Live MongoDB stats via the existing connection — no separate Atlas login needed. MongoDB {data.version}.
        </p>
      </div>

      {data.storage && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Storage</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Data Size" value={formatBytes(data.storage.dataSizeBytes)} />
            <MetricCard label="Storage Used" value={formatBytes(data.storage.storageSizeBytes)} />
            <MetricCard label="Index Size" value={formatBytes(data.storage.indexSizeBytes)} />
            <MetricCard label="Collections / Indexes" value={`${data.storage.collectionCount} / ${data.storage.indexCount}`} />
          </div>
        </section>
      )}

      {data.connections && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Connections & Traffic</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Active Connections" value={data.connections.current} sublabel={`of ${data.connections.available} available`} />
            <MetricCard label="Reads (queries)" value={data.opcounters?.query?.toLocaleString() ?? '—'} />
            <MetricCard label="Writes (insert+update)" value={((data.opcounters?.insert ?? 0) + (data.opcounters?.update ?? 0)).toLocaleString()} />
            <MetricCard label="Network In / Out" value={`${formatBytes(data.network?.bytesIn ?? 0)} / ${formatBytes(data.network?.bytesOut ?? 0)}`} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Slow Query Profiler</h2>
        <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4">
          {data.profiler.available ? (
            <StatusBadge status="healthy" label="Profiler available on this cluster" />
          ) : (
            <>
              <StatusBadge status="muted" label="Not available on the current cluster tier" />
              <p className="mt-2 text-xs text-[#64748B]">
                This is a live capability check, not a hardcoded flag — it'll start working automatically the moment
                the cluster is upgraded to a tier that allows the profiler (M10+), no changes needed here.
              </p>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Largest Collections</h2>
        <DataTable columns={COLUMNS} rows={data.topCollections} rowKey={(r) => r.name} />
      </section>
    </div>
  );
}
