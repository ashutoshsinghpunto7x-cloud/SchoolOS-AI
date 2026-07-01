import type { ImportStatus } from '@schoolos/types';

const CONFIG: Record<ImportStatus, { label: string; className: string }> = {
  uploading:   { label: 'Uploading',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  parsing:     { label: 'Parsing',     className: 'bg-blue-50 text-blue-700 border-blue-200' },
  validating:  { label: 'Validating',  className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  preview:     { label: 'Preview',     className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  confirmed:   { label: 'Confirmed',   className: 'bg-purple-50 text-purple-700 border-purple-200' },
  processing:  { label: 'Processing',  className: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed:   { label: 'Completed',   className: 'bg-green-50 text-green-700 border-green-200' },
  failed:      { label: 'Failed',      className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
  rolled_back: { label: 'Rolled Back', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

interface ImportStatusBadgeProps {
  status: ImportStatus;
}

export function ImportStatusBadge({ status }: ImportStatusBadgeProps) {
  const { label, className } = CONFIG[status] ?? CONFIG.failed;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}
