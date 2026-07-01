import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useProviderCatalog, useCreateIntegration } from '../hooks/useIntegrations';
import type { CredentialField } from '@schoolos/types';

function FieldInput({ field, value, onChange }: { field: CredentialField; value: string; onChange: (v: string) => void }) {
  if (field.type === 'select' && field.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <option value="">Select…</option>
        {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input
      type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );
}

export function ConnectIntegrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedKey = searchParams.get('provider') ?? '';

  const { data: catalog = [], isLoading: catalogLoading } = useProviderCatalog();
  const provider = catalog.find((p) => p.providerKey === preselectedKey) ?? catalog[0];

  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('sandbox');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [testResult] = useState<{ success: boolean; message: string } | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const create = useCreateIntegration();
  void createdId; // reserved for post-create test flow

  const setField = (key: string, value: string) =>
    setCredentials((prev) => ({ ...prev, [key]: value }));

  const canSubmit = !!provider && !!name.trim() && !create.isPending
    && (provider.credentialFields.filter((f) => f.required).every((f) => credentials[f.key]?.trim()));

  const handleSubmit = async () => {
    if (!provider) return;
    const result = await create.mutateAsync({
      providerKey:  provider.providerKey,
      name:         name.trim(),
      environment,
      credentials,
      config:       provider.configDefaults,
    });
    setCreatedId(result._id);
    navigate(`/integrations/${result._id}`);
  };

  if (catalogLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;
  }

  if (!provider) {
    return <div className="p-6 text-center text-gray-500">Provider not found.</div>;
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/integrations/marketplace')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Connect {provider.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{provider.description}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. ${provider.name} - Main Campus`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Environment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Environment</label>
          <div className="flex gap-3">
            {(['sandbox', 'production'] as const).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={[
                  'flex-1 py-2 text-sm border rounded-lg capitalize font-medium transition-colors',
                  environment === env
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-200',
                ].join(' ')}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        {/* Credential fields */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700 border-t border-gray-100 pt-4">Credentials</p>
          {provider.credentialFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <FieldInput field={field} value={credentials[field.key] ?? ''} onChange={(v) => setField(field.key, v)} />
              {field.helpText && <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>}
            </div>
          ))}
        </div>

        {/* Error */}
        {create.isError && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
            {create.error?.message ?? 'Failed to connect. Please check your credentials.'}
          </div>
        )}

        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${testResult.success ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {testResult.message}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/integrations/marketplace')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Connect Integration
        </button>
      </div>
    </div>
  );
}
