import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, Wifi, WifiOff, CheckCircle2, XCircle } from 'lucide-react';
import { useIntegration, useTestConnection, useTriggerSync, useUpdateIntegration, useSyncHistory } from '../hooks/useIntegrations';
import { IntegrationStatusBadge } from '../components/IntegrationStatusBadge';

export function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  const { data: integration, isLoading } = useIntegration(id);
  const test = useTestConnection(id!);
  const sync = useTriggerSync(id!);
  const update = useUpdateIntegration(id!);
  const { data: syncHistoryData } = useSyncHistory(id!, 1);
  const syncLogs = syncHistoryData?.data ?? [];

  const handleTest = async () => {
    setTestResult(null);
    const result = await test.mutateAsync();
    setTestResult(result);
  };

  const handleToggleEnabled = () => {
    if (!integration) return;
    update.mutate({ enabled: !integration.enabled });
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;
  }

  if (!integration) {
    return <div className="p-6 text-center text-gray-500">Integration not found. <Link to="/integrations" className="text-indigo-600 hover:underline">Back</Link></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/integrations/connected')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{integration.name}</h1>
              <IntegrationStatusBadge status={integration.status} />
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">{integration.environment}</span>
              {!integration.enabled && <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full">Disabled</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{integration.providerKey.replace(/_/g, ' ')} · {integration.providerType}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggleEnabled}
            disabled={update.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {integration.enabled ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {integration.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={handleTest}
            disabled={test.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {test.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            Test
          </button>
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending || !integration.enabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Now
          </button>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${testResult.success ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {testResult.message}
          {testResult.latencyMs && <span className="ml-auto text-xs opacity-70">{testResult.latencyMs}ms</span>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats + Config */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Sync Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Last Sync',   value: integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Never' },
                { label: 'Sync Status', value: integration.lastSyncStatus ?? '—' },
                { label: 'Next Sync',   value: integration.nextSyncAt ? new Date(integration.nextSyncAt).toLocaleString() : 'Manual only' },
                { label: 'Interval',    value: integration.config.syncInterval > 0 ? `${integration.config.syncInterval}min` : 'Manual' },
                { label: 'Timeout',     value: `${integration.config.timeout / 1000}s` },
                { label: 'Retry Count', value: String(integration.config.retryCount) },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-sm font-medium mt-0.5 capitalize ${s.label === 'Sync Status' && integration.lastSyncStatus === 'failure' ? 'text-red-600' : s.label === 'Sync Status' && integration.lastSyncStatus === 'success' ? 'text-green-600' : 'text-gray-800'}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            {integration.lastSyncError && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
                Last error: {integration.lastSyncError}
              </div>
            )}
          </div>

          {/* Sync History */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Recent Syncs</h2>
              <Link to={`/integrations/sync-history?integrationId=${id}`} className="text-xs text-indigo-600 hover:underline">Full history</Link>
            </div>
            {syncLogs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No syncs yet</p>
            ) : (
              <div className="space-y-2">
                {syncLogs.map((log) => (
                  <div key={log._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-gray-700 capitalize">{log.syncType} sync</p>
                      <p className="text-xs text-gray-400">{new Date(log.startedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{log.recordsSynced} synced</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.status === 'completed' ? 'bg-green-50 text-green-700' :
                        log.status === 'failed'    ? 'bg-red-50 text-red-700' :
                        log.status === 'running'   ? 'bg-blue-50 text-blue-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 h-fit">
          <h2 className="text-sm font-semibold text-gray-800">Timeline</h2>
          {integration.timeline.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">No events yet</p>
          ) : (
            <ol className="space-y-3">
              {[...integration.timeline].reverse().slice(0, 10).map((evt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-300 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-700 capitalize">{evt.event.replace(/_/g, ' ')}</p>
                    {evt.note && <p className="text-gray-500">{evt.note}</p>}
                    <p className="text-gray-400">{new Date(evt.at).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
