import { useMemo, useState } from 'react';
import { Loader2, Play, Square, ArrowLeft, Download } from 'lucide-react';
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  useOpsPerformanceLive,
  useOpsPerformanceHistory,
  useOpsPerformanceDetail,
  useStartPerformanceTest,
  useStopPerformanceTest,
} from '../hooks/useOpsData';
import { opsApi } from '../api/opsApi';
import type { PerformanceTestLiveSnapshot, PerformanceTestRun, PerformanceTestStage } from '../api/opsApi';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { opsColors } from '../theme';

type ViewMode = 'history' | 'live' | 'detail';

const STAGES: { key: PerformanceTestStage; label: string }[] = [
  { key: 'ramp-up', label: 'Ramp Up' },
  { key: 'steady', label: 'Steady Load' },
  { key: 'ramp-down', label: 'Ramp Down' },
  { key: 'completed', label: 'Completed' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statusToBadge(status: PerformanceTestRun['status']) {
  if (status === 'running') return { status: 'info' as const, label: 'Running' };
  if (status === 'completed') return { status: 'healthy' as const, label: 'Completed' };
  if (status === 'stopped') return { status: 'warning' as const, label: 'Stopped' };
  return { status: 'critical' as const, label: 'Failed' };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Start test form + history table ─────────────────────────────────────

function StartTestForm({ onStarted }: { onStarted: () => void }) {
  const [vus, setVus] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(2);
  const { mutate, isPending, error } = useStartPerformanceTest();

  return (
    <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-5">
      <h2 className="text-sm font-medium text-[#F4F6F8]">Start a test</h2>
      <p className="mt-1 text-xs text-[#98A2B3]">
        Runs the teacher workspace workflow (login → dashboard → attendance → save → logout) against your local dev
        server via k6, ramping to the target VUs, holding steady, then ramping down.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs text-[#98A2B3]">
          Virtual users
          <input
            type="number"
            min={1}
            max={500}
            value={vus}
            onChange={(e) => setVus(Number(e.target.value))}
            className="w-28 rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#98A2B3]">
          Duration (minutes)
          <input
            type="number"
            min={1}
            max={30}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-28 rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8]"
          />
        </label>
        <button
          disabled={isPending}
          onClick={() => mutate({ vus, durationMinutes }, { onSuccess: onStarted })}
          className="flex items-center gap-2 rounded-md bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6]/90 disabled:opacity-40"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Start Test
        </button>
      </div>
      {error && (
        <p className="mt-3 text-xs text-[#EF4444]">
          {(error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
            'Failed to start test.'}
        </p>
      )}
    </div>
  );
}

function HistoryTable({ onSelect }: { onSelect: (runId: string) => void }) {
  const { data, isLoading } = useOpsPerformanceHistory({ page: 1, limit: 50 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  const rows = data?.data ?? [];

  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.runId}
      emptyMessage="No performance tests run yet."
      columns={[
        {
          key: 'label',
          header: 'Test',
          render: (r) => (
            <button onClick={() => onSelect(r.runId)} className="text-left text-[#3B82F6] hover:underline">
              {r.label}
            </button>
          ),
        },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge {...statusToBadge(r.status)} /> },
        { key: 'vus', header: 'VUs', render: (r) => r.targetVUs },
        { key: 'duration', header: 'Duration', render: (r) => `${r.durationMinutes}m` },
        { key: 'avg', header: 'Avg (ms)', render: (r) => r.summary?.avgResponseMs ?? '—' },
        { key: 'p95', header: 'P95 (ms)', render: (r) => r.summary?.p95ResponseMs ?? '—' },
        {
          key: 'errorRate',
          header: 'Error Rate',
          render: (r) => (r.summary ? `${r.summary.errorRatePercent}%` : '—'),
        },
        { key: 'startedAt', header: 'Started', render: (r) => new Date(r.startedAt).toLocaleString() },
      ]}
    />
  );
}

function RunDetailView({ runId, onBack }: { runId: string; onBack: () => void }) {
  const { data: run, isLoading } = useOpsPerformanceDetail(runId);

  if (isLoading || !run) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  const s = run.summary;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#98A2B3] hover:text-[#F4F6F8]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to history
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#F4F6F8]">{run.label}</h1>
            <StatusBadge {...statusToBadge(run.status)} />
          </div>
          <p className="mt-1 text-sm text-[#98A2B3]">
            {run.targetVUs} VUs · {run.durationMinutes}m steady · started {new Date(run.startedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => downloadBlob(await opsApi.downloadPerformanceTestReport(runId, 'json'), `perf-${runId}.json`)}
            className="flex items-center gap-1.5 rounded-md border border-[#232D38] px-3 py-1.5 text-xs text-[#98A2B3] hover:text-[#F4F6F8]"
          >
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button
            onClick={async () => downloadBlob(await opsApi.downloadPerformanceTestReport(runId, 'csv'), `perf-${runId}.csv`)}
            className="flex items-center gap-1.5 rounded-md border border-[#232D38] px-3 py-1.5 text-xs text-[#98A2B3] hover:text-[#F4F6F8]"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {!s ? (
        <p className="text-sm text-[#98A2B3]">This run has no summary yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Total Requests" value={s.totalRequests} />
          <MetricCard label="Success Rate" value={`${s.successRatePercent}%`} />
          <MetricCard label="Error Rate" value={`${s.errorRatePercent}%`} accent={s.errorRatePercent > 1 ? opsColors.critical : undefined} />
          <MetricCard label="Peak VUs" value={s.peakVUs} />
          <MetricCard label="Avg Response" value={`${s.avgResponseMs} ms`} />
          <MetricCard label="P95" value={`${s.p95ResponseMs} ms`} />
          <MetricCard label="P99" value={`${s.p99ResponseMs} ms`} />
          <MetricCard label="Max Response" value={`${s.maxResponseMs} ms`} />
          <MetricCard label="429 Count" value={s.http429Count} accent={s.http429Count > 0 ? opsColors.warning : undefined} />
          <MetricCard label="500 Count" value={s.http500Count} accent={s.http500Count > 0 ? opsColors.critical : undefined} />
          <MetricCard label="Auth Failures" value={s.authFailures} />
          <MetricCard label="Teacher Workflow Success" value={`${s.teacherWorkflowSuccessRatePercent}%`} />
        </div>
      )}
    </div>
  );
}

// ── Live dashboard ───────────────────────────────────────────────────────

function StagePips({ current }: { current: PerformanceTestStage }) {
  const currentIdx = STAGES.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2">
      {STAGES.map((stage, idx) => (
        <div key={stage.key} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: idx <= currentIdx ? opsColors.info : opsColors.border,
              }}
            />
            <span className={`text-[10px] ${idx === currentIdx ? 'text-[#F4F6F8]' : 'text-[#64748B]'}`}>{stage.label}</span>
          </div>
          {idx < STAGES.length - 1 && (
            <div className="h-px w-8" style={{ backgroundColor: idx < currentIdx ? opsColors.info : opsColors.border }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">{title}</h3>
      <div className="h-56">{children}</div>
    </div>
  );
}

const chartTooltipStyle = {
  backgroundColor: opsColors.card,
  border: `1px solid ${opsColors.border}`,
  borderRadius: 8,
  fontSize: 12,
};

function LiveDashboard({ snapshot, onStop, onBack }: { snapshot: PerformanceTestLiveSnapshot; onStop: () => void; onBack: () => void }) {
  const { mutate: stop, isPending: stopping } = useStopPerformanceTest();

  const seriesData = useMemo(
    () =>
      snapshot.series.timestamps.map((t, i) => ({
        time: new Date(t).toLocaleTimeString(),
        avg: snapshot.series.avgResponseMs[i],
        p95: snapshot.series.p95ResponseMs[i],
        p99: snapshot.series.p99ResponseMs[i],
        rps: snapshot.series.requestsPerSec[i],
        vus: snapshot.series.virtualUsers[i],
        errorRate: snapshot.series.errorRatePercent[i],
      })),
    [snapshot.series],
  );

  const statusDonutData = useMemo(() => {
    const buckets: Record<string, number> = { '2xx': 0, '4xx': 0, '5xx': 0, other: 0 };
    for (const [code, count] of Object.entries(snapshot.statusCodeCounts)) {
      const n = Number(code);
      if (n >= 200 && n < 300) buckets['2xx'] += count;
      else if (n >= 400 && n < 500) buckets['4xx'] += count;
      else if (n >= 500) buckets['5xx'] += count;
      else buckets.other += count;
    }
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [snapshot.statusCodeCounts]);

  const donutColors: Record<string, string> = {
    '2xx': opsColors.healthy,
    '4xx': opsColors.warning,
    '5xx': opsColors.critical,
    other: opsColors.muted,
  };

  const isRunning = snapshot.status === 'running';

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#98A2B3] hover:text-[#F4F6F8]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to history
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#232D38] bg-[#121922] p-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#F4F6F8]">{snapshot.label}</h1>
            <StatusBadge {...statusToBadge(snapshot.status)} />
          </div>
          <p className="mt-1 text-xs text-[#98A2B3]">
            Elapsed {formatDuration(snapshot.elapsedSeconds)} · Remaining {formatDuration(snapshot.remainingSeconds)} ·
            {' '}Target {snapshot.targetVUs} VUs
          </p>
        </div>
        <StagePips current={snapshot.stage} />
        {isRunning && (
          <button
            disabled={stopping}
            onClick={() => stop(snapshot.runId, { onSuccess: onStop })}
            className="flex items-center gap-2 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/40 px-4 py-2 text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/20 disabled:opacity-40"
          >
            {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            Stop Test
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Virtual Users" value={`${snapshot.currentVUs} / ${snapshot.targetVUs}`} sublabel={`Peak ${snapshot.peakVUs}`} />
        <MetricCard label="Requests / Sec" value={snapshot.requestsPerSec} />
        <MetricCard label="Total Requests" value={snapshot.totalRequests} sublabel={`${snapshot.successfulRequests} ok / ${snapshot.failedRequests} failed`} />
        <MetricCard
          label="Success Rate"
          value={`${snapshot.successRatePercent}%`}
          accent={snapshot.successRatePercent < 99 ? opsColors.warning : undefined}
        />
        <MetricCard
          label="Error Rate"
          value={`${snapshot.errorRatePercent}%`}
          accent={snapshot.errorRatePercent > 1 ? opsColors.critical : undefined}
        />
        <MetricCard label="Avg Response Time" value={`${snapshot.avgResponseMs} ms`} />
        <MetricCard label="P95 / P99" value={`${snapshot.p95ResponseMs} / ${snapshot.p99ResponseMs} ms`} />
        <MetricCard label="Max Response Time" value={`${snapshot.maxResponseMs} ms`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Response Time (ms)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesData}>
              <CartesianGrid stroke={opsColors.border} strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={opsColors.muted} fontSize={10} minTickGap={40} />
              <YAxis stroke={opsColors.muted} fontSize={10} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="avg" name="Average" stroke={opsColors.info} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="p95" name="P95" stroke={opsColors.warning} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="p99" name="P99" stroke={opsColors.critical} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requests Per Second">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesData}>
              <CartesianGrid stroke={opsColors.border} strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={opsColors.muted} fontSize={10} minTickGap={40} />
              <YAxis stroke={opsColors.muted} fontSize={10} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="rps" name="Req/s" stroke={opsColors.healthy} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Virtual Users">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesData}>
              <CartesianGrid stroke={opsColors.border} strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={opsColors.muted} fontSize={10} minTickGap={40} />
              <YAxis stroke={opsColors.muted} fontSize={10} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="vus" name="VUs" stroke="#A78BFA" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4 lg:col-span-1">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">HTTP Status Codes</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDonutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {statusDonutData.map((entry) => (
                    <Cell key={entry.name} fill={donutColors[entry.name] ?? opsColors.muted} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2">
          <DataTable
            rows={snapshot.topEndpoints}
            rowKey={(r) => r.name}
            emptyMessage="No requests yet."
            columns={[
              { key: 'name', header: 'Endpoint', render: (r) => r.name },
              { key: 'requests', header: 'Requests', render: (r) => r.requests, align: 'right' },
              { key: 'avg', header: 'Avg Response', render: (r) => `${r.avgMs} ms`, align: 'right' },
            ]}
          />
        </div>
      </div>

      <ChartCard title="Error Rate Over Time (%)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={seriesData}>
            <CartesianGrid stroke={opsColors.border} strokeDasharray="3 3" />
            <XAxis dataKey="time" stroke={opsColors.muted} fontSize={10} minTickGap={40} />
            <YAxis stroke={opsColors.muted} fontSize={10} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Line type="monotone" dataKey="errorRate" name="Error %" stroke={opsColors.critical} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <MetricCard label="CPU Usage" value={`${snapshot.infra.cpuPercent}%`} accent={snapshot.infra.cpuPercent > 80 ? opsColors.critical : undefined} />
        <MetricCard
          label="Memory Usage"
          value={`${snapshot.infra.memoryUsedMb} MB`}
          sublabel={`of ${snapshot.infra.memoryTotalMb} MB`}
        />
        <MetricCard label="MongoDB Latency" value={`${snapshot.infra.mongoLatencyMs} ms`} />
        <MetricCard label="Mongo Pool Size" value={snapshot.infra.mongoPoolSize} />
        <MetricCard label="Event Loop Delay" value={`${snapshot.infra.eventLoopDelayMs} ms`} />
        <MetricCard
          label="Mongo Health"
          value={snapshot.infra.mongoHealthy ? 'Healthy' : 'Disconnected'}
          accent={snapshot.infra.mongoHealthy ? undefined : opsColors.critical}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Live Alerts</h3>
          {snapshot.alerts.length === 0 ? (
            <p className="text-sm text-[#64748B]">No alerts — everything healthy.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {snapshot.alerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-[#232D38] p-2.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.severity === 'critical' ? 'critical' : 'warning'} label={a.severity} />
                    <span className="text-sm font-medium text-[#F4F6F8]">{a.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#98A2B3]">{a.message}</p>
                  <p className="mt-1 text-[10px] text-[#64748B]">{new Date(a.occurredAt).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#232D38] bg-[#121922] p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Test Activity</h3>
          <div className="space-y-1.5 max-h-72 overflow-y-auto text-xs">
            {snapshot.activity.map((a, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[#64748B]">{new Date(a.timestamp).toLocaleTimeString()}</span>
                <span
                  className={
                    a.level === 'critical' ? 'text-[#EF4444]' : a.level === 'warning' ? 'text-[#F59E0B]' : 'text-[#98A2B3]'
                  }
                >
                  {a.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function OpsPerformancePage() {
  const [mode, setMode] = useState<ViewMode>('history');
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const { data: live, isLoading: liveLoading } = useOpsPerformanceLive();

  const effectiveMode: ViewMode = live?.status === 'running' ? 'live' : mode;

  if (liveLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (effectiveMode === 'live' && live) {
    return (
      <LiveDashboard
        snapshot={live}
        onStop={() => setMode('history')}
        onBack={() => setMode('history')}
      />
    );
  }

  if (effectiveMode === 'detail' && selectedRunId) {
    return <RunDetailView runId={selectedRunId} onBack={() => setMode('history')} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Performance Testing</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Run k6 load tests against your local server and watch a live, second-by-second dashboard — no terminal
          required.
        </p>
      </div>

      <StartTestForm onStarted={() => setMode('live')} />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">History</h2>
        <HistoryTable
          onSelect={(runId) => {
            setSelectedRunId(runId);
            setMode('detail');
          }}
        />
      </div>
    </div>
  );
}

export default OpsPerformancePage;
