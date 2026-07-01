import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Settings, ChevronRight, Loader2, ToggleLeft, ToggleRight, Clock, RefreshCw, Radio } from 'lucide-react';
import { useWorkflows, useUpdateWorkflowConfig } from '../hooks/useWorkflows';
import type { WorkflowId } from '@schoolos/types';

export function WorkflowLibraryPage() {
  const navigate = useNavigate();
  const { data: workflows, isLoading } = useWorkflows();
  const updateConfig = useUpdateWorkflowConfig();
  const [togglingId, setTogglingId] = useState<WorkflowId | null>(null);

  const handleToggle = async (id: WorkflowId, currentEnabled: boolean) => {
    setTogglingId(id);
    try {
      await updateConfig.mutateAsync({ id, payload: { enabled: !currentEnabled } });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workflow Library</h1>
        <p className="text-sm text-gray-500 mt-1">Configure and manage your 8 production automation workflows</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {(workflows ?? []).map((wf) => (
            <div
              key={wf.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${wf.config.enabled ? 'bg-indigo-50' : 'bg-gray-100'}`}>
                  <Zap className={`w-5 h-5 ${wf.config.enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{wf.id}</span>
                    <h3 className="text-sm font-semibold text-gray-900">{wf.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wf.config.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {wf.config.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{wf.description}</p>

                  {/* Config chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {wf.config.delayMinutes > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" />
                        {wf.config.delayMinutes}m delay
                      </span>
                    )}
                    {wf.config.retryCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        <RefreshCw className="w-3 h-3" />
                        {wf.config.retryCount} retries
                      </span>
                    )}
                    {wf.config.channels.map((ch) => (
                      <span key={ch} className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        <Radio className="w-3 h-3" />
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(wf.id as WorkflowId, wf.config.enabled)}
                    disabled={togglingId === wf.id}
                    className="p-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title={wf.config.enabled ? 'Disable workflow' : 'Enable workflow'}
                  >
                    {togglingId === wf.id ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : wf.config.enabled ? (
                      <ToggleRight className="w-7 h-7 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-gray-300" />
                    )}
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => navigate(`/automation/library/${wf.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configure
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
