import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { useFeatureFlagsList, useCreateFeatureFlag } from '../hooks/useFeatureFlags';
import type { Feature, FeatureStatus } from '../api/featureFlagsApi';
import { extractErrorMessage } from '@/services/api';

const STATUS_LABEL: Record<FeatureStatus, string> = {
  enabled: 'Enabled',
  disabled: 'Disabled',
  maintenance: 'Maintenance',
  beta: 'Beta',
  deprecated: 'Deprecated',
};

function statusBadgeStatus(status: FeatureStatus): 'healthy' | 'warning' | 'critical' | 'info' | 'muted' {
  if (status === 'enabled') return 'healthy';
  if (status === 'beta') return 'info';
  if (status === 'maintenance') return 'warning';
  if (status === 'deprecated') return 'muted';
  return 'critical';
}

function visibilitySummary(feature: Feature): string {
  if (feature.visibilityMode === 'everyone') return 'Everyone';
  if (feature.visibilityMode === 'nobody') return 'Nobody';
  const parts: string[] = [];
  if (feature.rolloutPercentage > 0) parts.push(`${feature.rolloutPercentage}% rollout`);
  parts.push('Targeted');
  return parts.join(' · ');
}

export function OpsFeatureFlagsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'super_admin';
  const { data: features, isLoading, isError } = useFeatureFlagsList();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    if (!features) return [];
    const q = search.trim().toLowerCase();
    if (!q) return features;
    return features.filter((f) => f.name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q));
  }, [features, search]);

  const totals = useMemo(() => {
    const enabled = features?.filter((f) => f.status === 'enabled').length ?? 0;
    const beta = features?.filter((f) => f.status === 'beta').length ?? 0;
    return { total: features?.length ?? 0, enabled, beta };
  }, [features]);

  const columns: DataTableColumn<Feature>[] = [
    {
      key: 'name',
      header: 'Feature',
      render: (f) => (
        <Link to={`/ops/feature-flags/${encodeURIComponent(f.key)}`} className="hover:underline">
          <div className="font-medium">{f.name}</div>
          <div className="text-xs text-[#64748B]">{f.key}</div>
        </Link>
      ),
    },
    { key: 'version', header: 'Version', render: (f) => f.version || '—' },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={statusBadgeStatus(f.status)} label={STATUS_LABEL[f.status]} /> },
    { key: 'visibility', header: 'Visible To', render: (f) => <span className="text-[#98A2B3]">{visibilitySummary(f)}</span> },
    { key: 'updated', header: 'Last Updated', render: (f) => new Date(f.updatedAt).toLocaleString() },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-sm text-[#EF4444]">Failed to load feature flags.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F4F6F8]">Feature Management</h1>
          <p className="mt-1 text-sm text-[#98A2B3]">
            Ship unfinished features to production and control exactly who sees them.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> New Feature
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Total Features" value={totals.total} />
        <MetricCard label="Enabled" value={totals.enabled} accent="#22C55E" />
        <MetricCard label="Beta" value={totals.beta} accent="#3B82F6" />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or key…"
        className="w-full max-w-sm rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
      />

      <DataTable columns={columns} rows={filtered} rowKey={(f) => f._id} emptyMessage="No features match your search." />

      {showCreate && <CreateFeatureModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateFeatureModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');
  const { mutate, isPending } = useCreateFeatureFlag();

  const submit = () => {
    setError('');
    mutate(
      { key: key.trim(), name: name.trim(), description: description.trim() || undefined, version: version.trim() || undefined },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(extractErrorMessage(err)),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#232D38] bg-[#121922] p-6">
        <h2 className="text-base font-semibold text-[#F4F6F8]">New Feature</h2>
        <div className="mt-4 space-y-3">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Key (e.g. attendance-v2)"
            className="w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name (e.g. Attendance V2)"
            className="w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="Version (optional, e.g. v2.1)"
            className="w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        {error && <p className="mt-3 text-xs text-[#EF4444]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-[#232D38] px-3 py-1.5 text-sm text-[#98A2B3] hover:text-[#F4F6F8]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending || !key.trim() || !name.trim()}
            className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
