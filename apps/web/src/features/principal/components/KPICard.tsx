import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-600',    text: 'text-blue-600'    },
  green:   { bg: 'bg-green-50',   icon: 'bg-green-100 text-green-600',   text: 'text-green-600'   },
  amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600',   text: 'text-amber-600'   },
  red:     { bg: 'bg-red-50',     icon: 'bg-red-100 text-red-600',       text: 'text-red-600'     },
  indigo:  { bg: 'bg-indigo-50',  icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-600'  },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600',text: 'text-emerald-600'},
  rose:    { bg: 'bg-rose-50',    icon: 'bg-rose-100 text-rose-600',     text: 'text-rose-600'    },
} as const;

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: keyof typeof COLOR_MAP;
  onClick?: () => void;
}

export const KPICard = ({ title, value, subtitle, icon: Icon, color, onClick }: KPICardProps) => {
  const c = COLOR_MAP[color];
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col gap-3',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow duration-150',
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', c.icon)}>
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export const KPICardSkeleton = () => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 w-24 bg-gray-100 rounded" />
      <div className="w-9 h-9 bg-gray-100 rounded-xl" />
    </div>
    <div className="h-7 w-16 bg-gray-100 rounded mb-1" />
    <div className="h-3 w-20 bg-gray-100 rounded" />
  </div>
);
