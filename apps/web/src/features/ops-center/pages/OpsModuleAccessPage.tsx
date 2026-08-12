import { useMemo, useState } from 'react';
import { Loader2, ShieldOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { useModuleAccessList, useBulkSetModuleAccess } from '../hooks/useModuleAccess';
import { extractErrorMessage } from '@/services/api';

const inputClass =
  'w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50';

export function OpsModuleAccessPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'super_admin';

  const { data: rows, isLoading, isError } = useModuleAccessList();
  const bulkMutation = useBulkSetModuleAccess();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [modalIntent, setModalIntent] = useState<'restrict' | 'restore' | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => {
    const restricted = rows?.filter((r) => r.restricted).length ?? 0;
    return { total: rows?.length ?? 0, restricted, available: (rows?.length ?? 0) - restricted };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-sm text-[#EF4444]">Failed to load module access.</div>;
  }

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.key)));
    }
  };

  const closeModal = () => {
    setModalIntent(null);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Module Access</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Every top-level feature across all dashboards, in one place. Select one or more and pause them in
          production — the nav link stays visible, but the page itself shows a "temporarily unavailable" notice
          to every user until you restore it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Total Modules" value={totals.total} />
        <MetricCard label="Available" value={totals.available} accent="#22C55E" />
        <MetricCard label="Restricted" value={totals.restricted} accent="#EF4444" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full max-w-sm rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
        />

        {canManage && selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#98A2B3]">{selected.size} selected</span>
            <button
              onClick={() => setModalIntent('restrict')}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#EF4444] px-3 py-2 text-sm font-medium text-white"
            >
              <ShieldOff className="h-4 w-4" /> Restrict Selected
            </button>
            <button
              onClick={() => setModalIntent('restore')}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#232D38] px-3 py-2 text-sm text-[#98A2B3] hover:text-[#F4F6F8]"
            >
              <ShieldCheck className="h-4 w-4" /> Restore Selected
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#232D38]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121922] text-xs uppercase tracking-wide text-[#98A2B3]">
            <tr>
              {canManage && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-[#232D38] bg-[#0B0F14]"
                  />
                </th>
              )}
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Expected Back</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-sm text-[#64748B]">
                  No modules match your search.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.key} className="border-t border-[#232D38] hover:bg-[#121922]/60">
                {canManage && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.key)}
                      onChange={() => toggleRow(row.key)}
                      className="h-4 w-4 rounded border-[#232D38] bg-[#0B0F14]"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="font-medium text-[#F4F6F8]">{row.label}</div>
                  <div className="text-xs text-[#64748B]">{row.key}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.restricted ? 'critical' : 'healthy'} label={row.restricted ? 'Restricted' : 'Available'} />
                </td>
                <td className="max-w-xs px-4 py-3 text-[#98A2B3]">{row.restricted ? (row.message || '—') : '—'}</td>
                <td className="px-4 py-3 text-[#98A2B3]">
                  {row.restricted && row.showReturnTime && row.returnAt ? new Date(row.returnAt).toLocaleString() : row.restricted ? 'Not shown' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalIntent && (
        <BulkActionModal
          intent={modalIntent}
          count={selected.size}
          isPending={bulkMutation.isPending}
          error={error}
          onCancel={closeModal}
          onConfirm={(payload) => {
            setError('');
            bulkMutation.mutate(
              { moduleKeys: Array.from(selected), restricted: modalIntent === 'restrict', ...payload },
              {
                onSuccess: () => {
                  setSelected(new Set());
                  closeModal();
                },
                onError: (err) => setError(extractErrorMessage(err)),
              },
            );
          }}
        />
      )}
    </div>
  );
}

function BulkActionModal({
  intent, count, isPending, error, onCancel, onConfirm,
}: {
  intent: 'restrict' | 'restore';
  count: number;
  isPending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (payload: { message?: string; returnAt?: string | null; showReturnTime?: boolean }) => void;
}) {
  const [message, setMessage] = useState('This section has been paused for maintenance. Please check back shortly.');
  const [showReturnTime, setShowReturnTime] = useState(false);
  const [returnAt, setReturnAt] = useState('');

  const submit = () => {
    if (intent === 'restore') {
      onConfirm({});
      return;
    }
    onConfirm({
      message: message.trim() || undefined,
      showReturnTime,
      returnAt: showReturnTime && returnAt ? new Date(returnAt).toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#232D38] bg-[#121922] p-6">
        <h2 className="text-base font-semibold text-[#F4F6F8]">
          {intent === 'restrict' ? `Restrict ${count} module${count === 1 ? '' : 's'}` : `Restore ${count} module${count === 1 ? '' : 's'}`}
        </h2>
        <p className="mt-2 text-sm text-[#98A2B3]">
          {intent === 'restrict'
            ? 'Every user loses access to these pages immediately. The sidebar link stays visible; opening the page shows your message instead.'
            : 'These modules become available to everyone again, immediately.'}
        </p>

        {intent === 'restrict' && (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-[#98A2B3]">Message shown to users</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={inputClass} />
            </label>

            <label className="flex items-center gap-2 text-sm text-[#F4F6F8]">
              <input type="checkbox" checked={showReturnTime} onChange={(e) => setShowReturnTime(e.target.checked)} className="h-4 w-4 rounded border-[#232D38] bg-[#0B0F14]" />
              Show an expected return time
            </label>

            {showReturnTime && (
              <label className="block">
                <span className="mb-1.5 block text-xs text-[#98A2B3]">Expected back</span>
                <input type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} className={inputClass} />
              </label>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-[#EF4444]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-[#232D38] px-3 py-1.5 text-sm text-[#98A2B3] hover:text-[#F4F6F8]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending || (intent === 'restrict' && showReturnTime && !returnAt)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 ${intent === 'restrict' ? 'bg-[#EF4444]' : 'bg-[#3B82F6]'}`}
          >
            {isPending ? 'Working…' : intent === 'restrict' ? 'Restrict Now' : 'Restore Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
