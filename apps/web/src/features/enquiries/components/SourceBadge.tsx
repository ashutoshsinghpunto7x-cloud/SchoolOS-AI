import type { EnquirySource } from '@schoolos/types';

const CONFIG: Record<EnquirySource, { label: string; className: string }> = {
  walk_in:      { label: 'Walk-in',      className: 'bg-green-100 text-green-700' },
  website:      { label: 'Website',      className: 'bg-blue-100 text-blue-700' },
  referral:     { label: 'Referral',     className: 'bg-purple-100 text-purple-700' },
  social_media: { label: 'Social Media', className: 'bg-pink-100 text-pink-700' },
  phone:        { label: 'Phone',        className: 'bg-amber-100 text-amber-700' },
  email:        { label: 'Email',        className: 'bg-indigo-100 text-indigo-700' },
  other:        { label: 'Other',        className: 'bg-gray-100 text-gray-600' },
};

interface SourceBadgeProps {
  source: EnquirySource;
}

export const SourceBadge = ({ source }: SourceBadgeProps) => {
  const { label, className } = CONFIG[source] ?? CONFIG.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
};

export const SOURCE_LABEL: Record<EnquirySource, string> = Object.fromEntries(
  Object.entries(CONFIG).map(([k, v]) => [k, v.label])
) as Record<EnquirySource, string>;
