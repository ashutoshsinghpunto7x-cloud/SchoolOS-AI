import { LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccentColor = 'blue' | 'amber' | 'green' | 'emerald' | 'purple' | 'rose' | 'indigo';

const ACCENT_MAP: Record<
  AccentColor,
  { iconBg: string; iconColor: string; badgeBg: string; arrowHover: string }
> = {
  blue: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700',
    arrowHover: 'group-hover:text-blue-500',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700',
    arrowHover: 'group-hover:text-amber-500',
  },
  green: {
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    badgeBg: 'bg-green-50 text-green-700',
    arrowHover: 'group-hover:text-green-500',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    arrowHover: 'group-hover:text-emerald-500',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700',
    arrowHover: 'group-hover:text-purple-500',
  },
  rose: {
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700',
    arrowHover: 'group-hover:text-rose-500',
  },
  indigo: {
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700',
    arrowHover: 'group-hover:text-indigo-500',
  },
};

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: AccentColor;
  /** Optional badge — e.g. "12 pending" */
  badge?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const ActionCard = ({
  icon: Icon,
  title,
  description,
  accent = 'blue',
  badge,
  onClick,
  disabled = false,
}: ActionCardProps) => {
  const colors = ACCENT_MAP[accent];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex flex-col bg-white rounded-2xl p-6 text-left w-full',
        'border border-gray-100 shadow-sm',
        'transition-all duration-200',
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-md'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
          colors.iconBg
        )}
      >
        <Icon className={cn('w-6 h-6', colors.iconColor)} strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div className="mt-5 flex-1">
        <h3 className="text-[17px] font-semibold text-gray-900 leading-tight">
          {title}
        </h3>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center">
        {badge && (
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg', colors.badgeBg)}>
            {badge}
          </span>
        )}
        <ArrowRight
          className={cn(
            'w-4 h-4 ml-auto text-gray-300 transition-colors duration-200',
            colors.arrowHover
          )}
        />
      </div>
    </button>
  );
};
