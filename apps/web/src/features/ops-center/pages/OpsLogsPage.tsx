import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useOpsLogs } from '../hooks/useOpsData';
import type { OpsLogEntry } from '../api/opsApi';

const LEVELS = ['all', 'error', 'warn', 'info', 'debug'] as const;

const LEVEL_COLOR: Record<string, string> = {
  error: '#EF4444',
  warn: '#F59E0B',
  info: '#3B82F6',
  debug: '#64748B',
};

function LogLine({ entry }: { entry: OpsLogEntry }) {
  const color = LEVEL_COLOR[entry.level] ?? '#98A2B3';
  return (
    <div className="border-b border-[#232D38] px-4 py-2 font-mono text-xs leading-relaxed last:border-0 hover:bg-white/[0.02]">
      <span className="text-[#64748B]">{new Date(entry.timestamp).toLocaleTimeString()}</span>{' '}
      <span className="font-semibold" style={{ color }}>
        [{entry.level.toUpperCase()}]
      </span>{' '}
      <span className="text-[#F4F6F8]">{entry.message}</span>
      {entry.meta && (
        <pre className="mt-1 whitespace-pre-wrap text-[#98A2B3]">{JSON.stringify(entry.meta, null, 2)}</pre>
      )}
    </div>
  );
}

export function OpsLogsPage() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('all');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(true);

  const { data, isLoading, isError, isFetching } = useOpsLogs(
    { level: level === 'all' ? undefined : level, search: search || undefined, limit: 300 },
    live,
  );

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F4F6F8]">Logs</h1>
          <p className="mt-1 text-sm text-[#98A2B3]">
            Live server log stream — in-memory ring buffer (last 2,000 entries), resets on restart.
          </p>
        </div>
        <button
          onClick={() => setLive((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-[#232D38] px-3 py-1.5 text-xs text-[#98A2B3] transition-colors hover:text-[#F4F6F8]"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: live ? '#22C55E' : '#64748B' }}
          />
          {live ? 'Live' : 'Paused'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs…"
          className="w-64 rounded-md border border-[#232D38] bg-[#121922] px-3 py-1.5 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
        />
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-md border px-2.5 py-1 text-xs uppercase tracking-wide transition-colors ${
                level === l
                  ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                  : 'border-[#232D38] text-[#98A2B3] hover:text-[#F4F6F8]'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-[#64748B]" />}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-[#232D38] bg-[#121922]">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
          </div>
        ) : isError || !data ? (
          <div className="p-4 text-sm text-[#EF4444]">Failed to load logs.</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No log entries match this filter.</div>
        ) : (
          data.map((entry) => <LogLine key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
