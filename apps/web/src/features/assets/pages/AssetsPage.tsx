import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Boxes as AssetIcon } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { AddAssetModal } from '../components/AddAssetModal';
import type { AssetCategory, AssetStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const CATEGORIES: { value: 'all' | AssetCategory; label: string }[] = [
  { value: 'all',           label: 'All' },
  { value: 'computers',     label: 'Computers' },
  { value: 'printers',      label: 'Printers' },
  { value: 'projectors',    label: 'Projectors' },
  { value: 'ac_units',      label: 'AC Units' },
  { value: 'desks',         label: 'Desks' },
  { value: 'smart_boards',  label: 'Smart Boards' },
  { value: 'vehicles',      label: 'Vehicles' },
  { value: 'other',         label: 'Other' },
];

const STATUS_BADGE: Record<AssetStatus, string> = {
  active:       'bg-emerald-100 text-emerald-800',
  under_repair: 'bg-amber-100 text-amber-800',
  disposed:     'bg-gray-100 text-gray-600',
};

const WARRANTY_SOON_DAYS = 30;

function warrantyBadge(warrantyExpiry?: string): { label: string; cls: string } | null {
  if (!warrantyExpiry) return null;
  const days = Math.ceil((new Date(warrantyExpiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Warranty expired', cls: 'bg-rose-100 text-rose-800' };
  if (days <= WARRANTY_SOON_DAYS) return { label: `Warranty ends in ${days}d`, cls: 'bg-amber-100 text-amber-800' };
  return null;
}

export function AssetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | AssetCategory>('all');
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');

  const { data, isLoading } = useAssets({
    search: search.trim() || undefined,
    category: category === 'all' ? undefined : category,
    limit: 100,
  });

  const assets = data?.data ?? [];

  function closeForm() {
    setShowForm(false);
    if (searchParams.get('new')) setSearchParams({}, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 sm:p-6">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Assets</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Equipment tracked across the campus</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>

        <div className="flex gap-3">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or asset ID…"
            className="flex-1 h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors',
                category === c.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !assets.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <AssetIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">No assets found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5">Asset</th>
                  <th className="text-left font-semibold px-3 py-2.5">Category</th>
                  <th className="text-left font-semibold px-3 py-2.5">Location</th>
                  <th className="text-left font-semibold px-3 py-2.5">Status</th>
                  <th className="text-left font-semibold px-3 py-2.5">Warranty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map((asset) => {
                  const warranty = warrantyBadge(asset.warrantyExpiry);
                  return (
                    <tr key={asset._id} className="hover:bg-gray-50/60">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{asset.name}</div>
                        <div className="font-mono text-xs text-gray-400">{asset.assetId}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600 capitalize">{asset.category.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3 text-gray-500">{asset.location}</td>
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center rounded-full font-medium text-xs px-2.5 py-1 capitalize', STATUS_BADGE[asset.status])}>
                          {asset.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {warranty ? (
                          <span className={cn('inline-flex items-center rounded-full font-medium text-xs px-2.5 py-1', warranty.cls)}>
                            {warranty.label}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
      </div>

      {showForm && <AddAssetModal onClose={closeForm} />}
    </div>
  );
}
