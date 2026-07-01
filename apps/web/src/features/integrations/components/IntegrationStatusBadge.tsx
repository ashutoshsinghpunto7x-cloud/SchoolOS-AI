import type { IntegrationStatus } from '@schoolos/types';

const CONFIG: Record<IntegrationStatus, { label: string; className: string; dot: string }> = {
  connected:    { label: 'Connected',    className: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-500' },
  disconnected: { label: 'Disconnected', className: 'bg-gray-100 text-gray-600 border-gray-200',     dot: 'bg-gray-400' },
  error:        { label: 'Error',        className: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500' },
  syncing:      { label: 'Syncing',      className: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500' },
  pending:      { label: 'Pending',      className: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
};

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const { label, className, dot } = CONFIG[status] ?? CONFIG.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'syncing' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
