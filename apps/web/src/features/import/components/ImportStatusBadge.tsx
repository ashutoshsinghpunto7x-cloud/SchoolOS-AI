import type { ImportStatus } from '@schoolos/types';

const CONFIG: Record<ImportStatus, { label: string; className: string }> = {
  uploading:   { label: 'Uploading',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
  parsing:     { label: 'Parsing',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
  validating:  { label: 'Validating',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
  preview:     { label: 'Preview',     className: 'bg-[#EEF1F8] text-[#1B2A4E] border-[#1B2A4E]/20' },
  confirmed:   { label: 'Confirmed',   className: 'bg-[#EEF1F8] text-[#1B2A4E] border-[#1B2A4E]/20' },
  processing:  { label: 'Processing',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
  completed:   { label: 'Completed',   className: 'bg-[#EEF1F8] text-[#1B2A4E] border-[#1B2A4E]/20' },
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
