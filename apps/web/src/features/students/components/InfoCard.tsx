import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoItem {
  label: string;
  value?: string;
}

interface InfoCardProps {
  title: string;
  icon?: LucideIcon;
  items: InfoItem[];
  className?: string;
  children?: React.ReactNode;
}

export const InfoCard = ({ title, icon: Icon, items, className, children }: InfoCardProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-gray-500" strokeWidth={1.75} />
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>

      {/* Fields */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              {item.label}
            </dt>
            <dd className="text-base font-medium text-gray-800 leading-snug">
              {item.value || <span className="text-gray-300 font-normal">Not provided</span>}
            </dd>
          </div>
        ))}
      </dl>

      {children && <div className="mt-6 pt-5 border-t border-gray-50">{children}</div>}
    </div>
  );
};
