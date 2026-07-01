import { useState } from 'react';
import { Key, Plus, Copy, RotateCcw, Trash2 } from 'lucide-react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useRotateApiKey } from '../hooks/useIntegrations';
import type { ApiKeyScope } from '@schoolos/types';

const ALL_SCOPES: ApiKeyScope[] = [
  'read:students', 'read:teachers', 'read:attendance', 'read:fees',
  'write:attendance', 'write:fees', 'read:integrations', 'write:integrations',
];

export function ApiKeyManager() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: keys = [], isLoading } = useApiKeys();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();
  const rotate = useRotateApiKey();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { rawKey } = await create.mutateAsync({ name: newName.trim(), scopes: selectedScopes });
    setRevealedKey(rawKey);
    setShowCreate(false);
    setNewName('');
    setSelectedScopes([]);
  };

  const copyToClipboard = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const toggleScope = (scope: ApiKeyScope) =>
    setSelectedScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage access keys for third-party integrations</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Key
        </button>
      </div>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-800">Save this key now — it will not be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white border border-yellow-200 rounded-lg text-xs font-mono text-gray-700 break-all">
              {revealedKey}
            </code>
            <button onClick={copyToClipboard} className="p-2 rounded-lg border border-yellow-200 text-yellow-700 hover:bg-yellow-100 transition-colors flex-shrink-0">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copiedKey && <p className="text-xs text-yellow-700">Copied!</p>}
          <button onClick={() => setRevealedKey(null)} className="text-xs text-yellow-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Create New API Key</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Key Name <span className="text-red-500">*</span></label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Attendance Sync App"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map((scope) => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={[
                    'px-2.5 py-1 text-xs rounded-full border font-medium transition-colors',
                    selectedScopes.includes(scope)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
                  ].join(' ')}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || create.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Create Key
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {isLoading ? (
          <div className="py-10 text-center text-gray-400">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="py-10 text-center">
            <Key className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No API keys yet</p>
          </div>
        ) : (
          keys.map((key) => (
            <div key={key._id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{key.name}</p>
                  {!key.enabled && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full">Revoked</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{key.keyPrefix}•••••••••••••••••••••••</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {key.scopes.map((s) => (
                    <span key={s} className="px-1.5 py-0.5 text-xs bg-gray-50 border border-gray-100 text-gray-500 rounded">{s}</span>
                  ))}
                </div>
              </div>
              {key.enabled && (
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => { if (window.confirm('Rotate this key? The old key will stop working immediately.')) rotate.mutate(key._id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Rotate
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Revoke this key?')) revoke.mutate(key._id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Revoke
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
