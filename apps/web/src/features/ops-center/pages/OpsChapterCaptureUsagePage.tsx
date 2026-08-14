import { Loader2 } from 'lucide-react';
import { useOpsChapterCaptureUsage } from '../hooks/useOpsData';
import { MetricCard } from '../components/MetricCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import type { OpsChapterCaptureUserUsage } from '../api/opsApi';

const COLUMNS: DataTableColumn<OpsChapterCaptureUserUsage>[] = [
  { key: 'userId', header: 'Teacher', render: (r) => <span className="font-medium">{r.userId}</span> },
  { key: 'documents', header: 'Documents', render: (r) => r.documents.toLocaleString(), align: 'right' },
  { key: 'pages', header: 'Pages', render: (r) => r.pages.toLocaleString(), align: 'right' },
  { key: 'wordsGenerated', header: 'Words Extracted', render: (r) => r.wordsGenerated.toLocaleString(), align: 'right' },
  { key: 'processingRequests', header: 'Processing Requests', render: (r) => r.processingRequests.toLocaleString(), align: 'right' },
];

export function OpsChapterCaptureUsagePage() {
  const { data, isLoading, isError } = useOpsChapterCaptureUsage();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-sm text-[#EF4444]">Failed to load chapter capture usage.</div>;
  }

  const { overview, byUser } = data;
  const failureRatePercent = overview.totalRequests > 0 ? Math.round((overview.failedRequests / overview.totalRequests) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Chapter Capture Usage</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Server-recorded usage for the layout-aware chapter capture feature — never computed from frontend
          state, so these numbers can't be manipulated from the browser.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Overview</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Teachers Using Feature" value={overview.totalUsers} />
          <MetricCard label="Documents Processed" value={overview.totalDocuments.toLocaleString()} />
          <MetricCard label="Pages Processed" value={overview.totalPages.toLocaleString()} />
          <MetricCard label="Words Extracted" value={overview.totalWords.toLocaleString()} />
          <MetricCard label="Processing Requests" value={overview.totalRequests.toLocaleString()} />
          <MetricCard
            label="Failure Rate"
            value={`${failureRatePercent}%`}
            sublabel={`${overview.failedRequests} of ${overview.totalRequests}`}
            accent={failureRatePercent > 10 ? '#EF4444' : undefined}
          />
          <MetricCard label="Avg Processing Time" value={`${overview.avgProcessingTimeMs} ms`} />
          <MetricCard label="Avg Words / Document" value={overview.avgWordsPerDocument.toLocaleString()} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Per-Teacher Usage</h2>
        <DataTable
          columns={COLUMNS}
          rows={byUser}
          rowKey={(r) => r.userId}
          emptyMessage="No chapter capture activity recorded yet."
        />
      </section>
    </div>
  );
}
