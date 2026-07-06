import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useProviderCatalog, useIntegrations } from '../hooks/useIntegrations';
import { ProviderCard } from '../components/ProviderCard';
import type { IntegrationProviderType } from '@schoolos/types';

const TYPES: { label: string; value: IntegrationProviderType | 'all' }[] = [
  { label: 'All',           value: 'all' },
  { label: 'Attendance',    value: 'attendance' },
  { label: 'Payment',       value: 'payment' },
  { label: 'Communication', value: 'communication' },
  { label: 'ERP',           value: 'erp' },
  { label: 'Calendar',      value: 'calendar' },
];

export function ProviderMarketplace() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<IntegrationProviderType | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data: catalog = [], isLoading } = useProviderCatalog();
  const { data: connected = [] } = useIntegrations();

  const connectedKeys = new Set(connected.map((i) => i.providerKey));

  const filtered = catalog.filter((p) => {
    const matchType = typeFilter === 'all' || p.providerType === typeFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/integrations')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Provider Marketplace</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connect FNIC to external platforms and services</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search providers…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={[
                'px-3 py-1.5 text-xs rounded-full border font-medium transition-colors',
                typeFilter === t.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading providers…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">No providers match your filters</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.providerKey}
              provider={provider}
              connected={connectedKeys.has(provider.providerKey)}
              onConnect={(key) => navigate(`/integrations/connect?provider=${key}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
