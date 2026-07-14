import { LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type CardAccent = 'blue' | 'purple' | 'amber' | 'green' | 'emerald';

const ACCENT: Record<CardAccent, { iconBg: string; iconColor: string; btn: string; ring: string }> = {
  blue: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    ring: 'focus-visible:ring-blue-500/50',
  },
  purple: {
    iconBg: 'bg-[#A855F7]/10',
    iconColor: 'text-[#5B21B6]',
    btn: 'bg-[#5B21B6] hover:bg-[#4C1D95] active:bg-[#3f1a94]',
    ring: 'focus-visible:ring-[#A855F7]/50',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    btn: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
    ring: 'focus-visible:ring-amber-500/50',
  },
  green: {
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    btn: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    ring: 'focus-visible:ring-green-500/50',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    btn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    ring: 'focus-visible:ring-emerald-500/50',
  },
};

interface ReceptionActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
  accent?: CardAccent;
  badge?: string;
  onClick?: () => void;
}

export const ReceptionActionCard = ({
  icon: Icon,
  title,
  description,
  buttonLabel,
  accent = 'blue',
  badge,
  onClick,
}: ReceptionActionCardProps) => {
  const colors = ACCENT[accent];

  return (
    <div
      className={cn(
        'group flex flex-col bg-white rounded-2xl p-6',
        'border border-gray-100',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5',
      )}
    >
      {/* Icon + badge row */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
            colors.iconBg
          )}
        >
          <Icon className={cn('w-7 h-7', colors.iconColor)} strokeWidth={1.75} />
        </div>

        {badge && (
          <span className="mt-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {badge}
          </span>
        )}
      </div>

      {/* Text content */}
      <div className="mt-5 flex-1">
        <h3 className="text-lg font-bold text-gray-900 leading-snug">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>

      {/* CTA button */}
      <button
        onClick={onClick}
        className={cn(
          'mt-6 w-full h-12 rounded-xl',
          'flex items-center justify-center gap-2',
          'text-sm font-semibold text-white',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          colors.btn,
          colors.ring,
        )}
        type="button"
      >
        {buttonLabel}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
