import { cn } from '@/lib/utils';

type CardAccent = 'blue' | 'purple' | 'amber' | 'green' | 'emerald';

// Purple accent reads from the shared --brand-purple-* CSS vars (see
// globals.css) so it stays in sync with the Reception/Admin gradient header —
// Tailwind's JIT scanner needs these as literal arbitrary-value strings.
const ACCENT: Record<CardAccent, { btn: string; ring: string }> = {
  blue: {
    btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    ring: 'focus-visible:ring-blue-500/50',
  },
  purple: {
    btn: 'bg-[var(--brand-purple-dark)] hover:bg-[var(--brand-purple-hover)] active:bg-[var(--brand-purple-active)]',
    ring: 'focus-visible:ring-[var(--brand-purple-light)]/50',
  },
  amber: {
    btn: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
    ring: 'focus-visible:ring-amber-500/50',
  },
  green: {
    btn: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    ring: 'focus-visible:ring-green-500/50',
  },
  emerald: {
    btn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    ring: 'focus-visible:ring-emerald-500/50',
  },
};

interface ReceptionActionCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  accent?: CardAccent;
  badge?: string;
  onClick?: () => void;
}

export const ReceptionActionCard = ({
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
      {badge && (
        <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
          {badge}
        </span>
      )}

      {/* Text content */}
      <div className={cn('flex-1', badge ? 'mt-3' : '')}>
        <h3 className="text-lg font-bold text-gray-900 leading-snug">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>

      {/* CTA button */}
      <button
        onClick={onClick}
        className={cn(
          'mt-6 w-full h-12 rounded-xl',
          'flex items-center justify-center',
          'text-sm font-semibold text-white',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          colors.btn,
          colors.ring,
        )}
        type="button"
      >
        {buttonLabel}
      </button>
    </div>
  );
};
