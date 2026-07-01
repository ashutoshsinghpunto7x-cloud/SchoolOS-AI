import { Link } from 'react-router-dom';
import { Trash2, ArrowRight, Plus } from 'lucide-react';
import { useIntegrations, useDeleteIntegration } from '../hooks/useIntegrations';
import { IntegrationStatusBadge } from '../components/IntegrationStatusBadge';

export function ConnectedIntegrationsPage() {
  const { data: integrations = [], isLoading } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Connected Integrations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{integrations.length} integration{integrations.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Link
          to="/integrations/marketplace"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Integration
        </Link>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : integrations.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 mb-3">No integrations connected yet.</p>
            <Link to="/integrations/marketplace" className="text-sm text-indigo-600 hover:underline">Browse the marketplace →</Link>
          </div>
        ) : (
          integrations.map((integration) => (
            <div key={integration._id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/40 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{integration.name}</p>
                  <IntegrationStatusBadge status={integration.status} />
                  {!integration.enabled && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Disabled</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">
                  {integration.providerKey.replace(/_/g, ' ')} · {integration.providerType}
                  {integration.lastSyncAt && ` · Last sync ${new Date(integration.lastSyncAt).toLocaleDateString()}`}
                  {integration.lastSyncError && ` · ${integration.lastSyncError.slice(0, 60)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${integration.name}"?`)) {
                      deleteIntegration.mutate(integration._id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link to={`/integrations/${integration._id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
