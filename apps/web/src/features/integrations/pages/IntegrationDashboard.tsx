import { Link } from 'react-router-dom';
import { Plug, CheckCircle2, XCircle, RefreshCw, Key, Webhook, ArrowRight, Activity } from 'lucide-react';
import { useIntegrationDashboard } from '../hooks/useIntegrations';
import { IntegrationStatusBadge } from '../components/IntegrationStatusBadge';

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

export function IntegrationDashboard() {
  const { data: stats, isLoading } = useIntegrationDashboard();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">Connect FNIC to external systems and services</p>
        </div>
        <div className="flex gap-3">
          <Link to="/integrations/marketplace" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Plug className="w-4 h-4" /> Provider Marketplace
          </Link>
          <Link to="/integrations/connected" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Activity className="w-4 h-4" /> Connected
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Integrations" value={isLoading ? '—' : (stats?.total ?? 0)} icon={Plug} color="bg-indigo-500" />
        <StatCard label="Connected"           value={isLoading ? '—' : (stats?.connected ?? 0)} icon={CheckCircle2} color="bg-green-500" />
        <StatCard label="Errors"              value={isLoading ? '—' : (stats?.error ?? 0)} icon={XCircle} color="bg-red-500" />
        <StatCard label="Recent Syncs"        value={isLoading ? '—' : (stats?.recentSyncs?.length ?? 0)} icon={RefreshCw} color="bg-blue-500" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/integrations/apikeys', icon: Key, label: 'API Keys', desc: 'Manage access keys for third-party apps' },
          { to: '/integrations/webhooks', icon: Webhook, label: 'Webhooks', desc: 'Configure outgoing event notifications' },
          { to: '/integrations/sync-history', icon: RefreshCw, label: 'Sync History', desc: 'View all synchronization logs' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Connected integrations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Connected Integrations</h2>
          <Link to="/integrations/connected" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {isLoading ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : !stats?.integrations?.length ? (
            <div className="px-5 py-10 text-center">
              <Plug className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No integrations yet</p>
              <Link to="/integrations/marketplace" className="text-xs text-indigo-600 hover:underline mt-1 block">Browse providers</Link>
            </div>
          ) : (
            stats.integrations.map((integration) => (
              <Link key={integration._id} to={`/integrations/${integration._id}`} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{integration.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{integration.providerKey.replace(/_/g, ' ')} · {integration.providerType}</p>
                </div>
                <div className="flex items-center gap-3">
                  <IntegrationStatusBadge status={integration.status} />
                  {integration.lastSyncAt && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      Synced {new Date(integration.lastSyncAt).toLocaleDateString()}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Recent syncs */}
      {stats?.recentSyncs && stats.recentSyncs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Sync Activity</h2>
            <Link to="/integrations/sync-history" className="text-xs text-indigo-600 hover:underline">Full history</Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {stats.recentSyncs.map((log) => (
              <div key={log._id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800 capitalize">{log.providerKey.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">{log.syncType} sync · {log.recordsSynced} records</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    log.status === 'completed' ? 'bg-green-50 text-green-700' :
                    log.status === 'failed'    ? 'bg-red-50 text-red-700' :
                    log.status === 'running'   ? 'bg-blue-50 text-blue-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{log.status}</span>
                  <span className="text-xs text-gray-400">{new Date(log.startedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
