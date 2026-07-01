import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import type { ProviderDefinition, IntegrationProviderType } from '@schoolos/types';

const TYPE_COLOR: Record<IntegrationProviderType | string, string> = {
  attendance:    'bg-blue-50 text-blue-700',
  payment:       'bg-green-50 text-green-700',
  communication: 'bg-purple-50 text-purple-700',
  erp:           'bg-orange-50 text-orange-700',
  calendar:      'bg-indigo-50 text-indigo-700',
  lms:           'bg-teal-50 text-teal-700',
  custom:        'bg-gray-100 text-gray-600',
};

interface ProviderCardProps {
  provider: ProviderDefinition;
  onConnect?: (providerKey: string) => void;
  connected?: boolean;
}

export function ProviderCard({ provider, onConnect, connected = false }: ProviderCardProps) {
  const typeClass = TYPE_COLOR[provider.providerType] ?? TYPE_COLOR.custom;

  return (
    <div className={`bg-white rounded-xl border p-5 space-y-3 transition-all ${provider.comingSoon ? 'opacity-60' : 'hover:border-indigo-200 hover:shadow-sm'} ${connected ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${typeClass}`}>
              {provider.providerType}
            </span>
            {provider.comingSoon && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                <Lock className="w-2.5 h-2.5" /> Coming Soon
              </span>
            )}
            {connected && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">Connected</span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{provider.description}</p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1">
        {provider.capabilities.map((cap) => (
          <span key={cap} className="px-1.5 py-0.5 text-xs bg-gray-50 text-gray-500 border border-gray-100 rounded">
            {cap.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Action */}
      {!provider.comingSoon && (
        <div className="pt-1">
          {connected ? (
            <Link
              to={`/integrations/connected`}
              className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              onClick={() => onConnect?.(provider.providerKey)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              Connect <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
