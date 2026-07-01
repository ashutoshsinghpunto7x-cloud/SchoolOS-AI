import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, Loader2, Save, Play, ToggleLeft, ToggleRight,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { useWorkflow, useWorkflowStats, useUpdateWorkflowConfig, useTriggerWorkflow } from '../hooks/useWorkflows';
import type { WorkflowId, UpdateWorkflowConfigPayload } from '@schoolos/types';

const Field = ({
  label, description, children,
}: {
  label: string; description?: string; children: React.ReactNode;
}) => (
  <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
    <div className="flex-1 min-w-0 pr-8">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

export function WorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();

  const { data: wf, isLoading } = useWorkflow(workflowId as WorkflowId ?? null);
  const { data: stats } = useWorkflowStats(workflowId as WorkflowId ?? null);
  const updateConfig = useUpdateWorkflowConfig();
  const triggerWorkflow = useTriggerWorkflow();

  const [form, setForm] = useState<UpdateWorkflowConfigPayload>({});
  const [dirty, setDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  useEffect(() => {
    if (wf) {
      setForm({
        enabled: wf.config.enabled,
        delayMinutes: wf.config.delayMinutes,
        retryCount: wf.config.retryCount,
        retryIntervalMinutes: wf.config.retryIntervalMinutes,
        channels: wf.config.channels,
      });
      setDirty(false);
    }
  }, [wf]);

  const handleChange = <K extends keyof UpdateWorkflowConfigPayload>(k: K, v: UpdateWorkflowConfigPayload[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!workflowId || !dirty) return;
    const configurable = wf?.configurable ?? [];
    const patch: UpdateWorkflowConfigPayload = {};
    for (const k of configurable) {
      if (k in form) (patch as Record<string, unknown>)[k] = form[k as keyof UpdateWorkflowConfigPayload];
    }
    await updateConfig.mutateAsync({ id: workflowId as WorkflowId, payload: patch });
    setDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTrigger = async () => {
    if (!workflowId) return;
    setTriggerError(null);
    try {
      await triggerWorkflow.mutateAsync({ workflowId: workflowId as WorkflowId, payload: {} });
      setTriggerSuccess(true);
      setTimeout(() => setTriggerSuccess(false), 3000);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Failed to trigger workflow');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!wf) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Workflow not found.</p>
        <button onClick={() => navigate('/automation/library')} className="text-indigo-600 text-sm mt-2 hover:underline">Go back</button>
      </div>
    );
  }

  const isConfigurable = (field: string) => wf.configurable.includes(field as never);
  const successRate = stats && stats.totalExecutions > 0
    ? Math.round((stats.successCount / stats.totalExecutions) * 100)
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back + Header */}
      <button onClick={() => navigate('/automation/library')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Workflow Library
      </button>

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${form.enabled ? 'bg-indigo-50' : 'bg-gray-100'}`}>
          <Zap className={`w-6 h-6 ${form.enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{wf.id}</span>
            <h1 className="text-xl font-bold text-gray-900">{wf.name}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">{wf.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTrigger}
            disabled={!form.enabled || triggerWorkflow.isPending}
            title={!form.enabled ? 'Enable workflow first' : 'Trigger manually'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {triggerWorkflow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {triggerSuccess ? 'Triggered!' : 'Trigger'}
          </button>
        </div>
      </div>

      {triggerError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {triggerError}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.totalExecutions}</p>
            <p className="text-xs text-gray-500 mt-1">Total Runs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{successRate !== null ? `${successRate}%` : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Success Rate</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.avgDurationMs > 0 ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Avg Duration</p>
          </div>
        </div>
      )}

      {/* Config */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Configuration</h2>
        </div>
        <div className="px-5">
          {/* Enable/Disable */}
          <Field label="Enabled" description="Turn this workflow on or off">
            <button
              onClick={() => handleChange('enabled', !form.enabled)}
              disabled={!isConfigurable('enabled')}
              className="disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {form.enabled
                ? <ToggleRight className="w-8 h-8 text-indigo-600" />
                : <ToggleLeft className="w-8 h-8 text-gray-300" />}
            </button>
          </Field>

          {/* Delay */}
          {isConfigurable('delayMinutes') && (
            <Field label="Delay (minutes)" description="Wait before firing the workflow after trigger">
              <input
                type="number"
                min={0}
                max={10080}
                value={form.delayMinutes ?? 0}
                onChange={(e) => handleChange('delayMinutes', Number(e.target.value))}
                className="w-24 text-right border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
          )}

          {/* Retry count */}
          {isConfigurable('retryCount') && (
            <Field label="Retry Count" description="Number of times to retry on failure">
              <input
                type="number"
                min={0}
                max={5}
                value={form.retryCount ?? 0}
                onChange={(e) => handleChange('retryCount', Number(e.target.value))}
                className="w-24 text-right border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
          )}

          {/* Retry interval */}
          {isConfigurable('retryIntervalMinutes') && (
            <Field label="Retry Interval (minutes)" description="Wait between retry attempts">
              <input
                type="number"
                min={0}
                max={10080}
                value={form.retryIntervalMinutes ?? 0}
                onChange={(e) => handleChange('retryIntervalMinutes', Number(e.target.value))}
                className="w-24 text-right border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
          )}

          {/* Channels */}
          {isConfigurable('channels') && (
            <Field label="Channels" description="Delivery channels used by this workflow">
              <div className="flex flex-wrap gap-1.5 justify-end max-w-xs">
                {['VOICE_CALL', 'WHATSAPP', 'SMS', 'EMAIL'].map((ch) => {
                  const active = (form.channels ?? []).includes(ch);
                  return (
                    <button
                      key={ch}
                      onClick={() => {
                        const current = form.channels ?? [];
                        const next = active ? current.filter((c) => c !== ch) : [...current, ch];
                        handleChange('channels', next);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
        </div>
      </div>

      {/* Save button */}
      {dirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateConfig.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {updateConfig.isPending ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
