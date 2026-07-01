import { useState } from 'react';
import { Webhook, Plus, Trash2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useWebhooks, useCreateWebhook, useDeleteWebhook, useUpdateWebhook, useWebhookDeliveries } from '../hooks/useIntegrations';
import type { WebhookEndpoint } from '@schoolos/types';

const COMMON_EVENTS = [
  'student.created', 'student.updated', 'fee.payment_recorded',
  'attendance.bulk_marked', 'integration.sync_completed', 'integration.sync_failed',
];

function CreateWebhookForm({ onDone }: { onDone: () => void }) {
  const [name, setName]     = useState('');
  const [url, setUrl]       = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const create = useCreateWebhook();

  const toggleEvent = (e: string) =>
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim() || events.length === 0) return;
    await create.mutateAsync({ name: name.trim(), url: url.trim(), events, secret: secret || undefined });
    onDone();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-800">Add Outgoing Webhook</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Attendance Notifier" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">URL <span className="text-red-500">*</span></label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/webhook" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Signing Secret (optional)</label>
        <input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" placeholder="Your webhook signing secret" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        <p className="text-xs text-gray-400 mt-1">Used to sign payloads with HMAC-SHA256. Verify the X-SchoolOS-Signature header.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Events <span className="text-red-500">*</span></label>
        <div className="flex flex-wrap gap-2">
          {COMMON_EVENTS.map((evt) => (
            <button key={evt} onClick={() => toggleEvent(evt)}
              className={['px-2.5 py-1 text-xs rounded-full border font-medium transition-colors', events.includes(evt) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'].join(' ')}>
              {evt}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onDone} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
        <button onClick={handleSubmit} disabled={!name.trim() || !url.trim() || events.length === 0 || create.isPending}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
          Create Webhook
        </button>
      </div>
    </div>
  );
}

function DeliveryBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: 'bg-green-50 text-green-700',
    failed:    'bg-red-50 text-red-700',
    retrying:  'bg-yellow-50 text-yellow-700',
    pending:   'bg-blue-50 text-blue-700',
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function WebhookRow({ hook }: { hook: WebhookEndpoint }) {
  const [expanded, setExpanded] = useState(false);
  const deleteHook  = useDeleteWebhook();
  const updateHook  = useUpdateWebhook(hook._id);
  const { data: deliveriesData } = useWebhookDeliveries(hook._id, 1);
  const deliveries  = deliveriesData?.data ?? [];

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/40 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800">{hook.name}</p>
            {!hook.enabled && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Disabled</span>}
          </div>
          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{hook.url}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {hook.events.map((e) => <span key={e} className="px-1.5 py-0.5 text-xs bg-gray-50 border border-gray-100 text-gray-500 rounded">{e}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button onClick={() => updateHook.mutate({ enabled: !hook.enabled })} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors" title={hook.enabled ? 'Disable' : 'Enable'}>
            {hook.enabled ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4" />}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          <button onClick={() => { if (window.confirm(`Delete "${hook.name}"?`)) deleteHook.mutate(hook._id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-xs font-medium text-gray-600">Recent Deliveries</p>
          {deliveries.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No deliveries yet</p>
          ) : (
            deliveries.slice(0, 5).map((d) => (
              <div key={d._id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-xs">
                <span className="text-gray-600 font-medium">{d.event}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{new Date(d.createdAt).toLocaleString()}</span>
                  <DeliveryBadge status={d.status} />
                  <span className="text-gray-400">{d.attempts.length} attempt{d.attempts.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function WebhookManager() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: hooks = [], isLoading } = useWebhooks();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure outgoing event notifications to external services</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {showCreate && <CreateWebhookForm onDone={() => setShowCreate(false)} />}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : hooks.length === 0 ? (
          <div className="py-12 text-center">
            <Webhook className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No webhooks configured</p>
          </div>
        ) : (
          hooks.map((hook) => <WebhookRow key={hook._id} hook={hook} />)
        )}
      </div>
    </div>
  );
}
