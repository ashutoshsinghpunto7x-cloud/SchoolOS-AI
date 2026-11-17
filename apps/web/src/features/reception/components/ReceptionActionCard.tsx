import { cn } from '@/lib/utils';

type CardAccent = 'blue' | 'purple' | 'amber' | 'green' | 'emerald';

// Purple accent reads from the shared --brand-purple-* CSS vars (see
// globals.css) so it stays in sync with the Reception/Admin gradient header —
// Tailwind's JIT scanner needs these as literal arbitrary-value strings.
const ACCENT: Record<CardAccent, { btn: string; ring: string }> = {
  blue: {
    btn: 'bg-[#254A9A] hover:bg-[#1B2A4E] active:bg-[#15223E]',
    ring: 'focus-visible:ring-[#254A9A]/50',
  },
  purple: {
    btn: 'bg-[#1B2A4E] hover:bg-[#2C4177] active:bg-[#15223E]',
    ring: 'focus-visible:ring-[#1B2A4E]/50',
  },
  amber: {
    btn: 'bg-[#D9822B] hover:bg-[#B86B1F] active:bg-[#9C5817]',
    ring: 'focus-visible:ring-[#D9822B]/50',
  },
  green: {
    btn: 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900',
    ring: 'focus-visible:ring-emerald-600/50',
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
        "group flex flex-col bg-white rounded-[18px] p-6 font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]",
        'border border-[#E8E2D6]',
        'shadow-xs hover:shadow-md',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5',
      )}
    >
      {badge && (
        <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F3EEE3] text-[#1B2A4E]">
          {badge}
        </span>
      )}

      {/* Text content */}
      <div className={cn('flex-1', badge ? 'mt-3' : '')}>
        <h3 className="text-lg font-bold text-[#1B2A4E] leading-snug">{title}</h3>
        <p className="mt-2 text-sm text-[#55607A] leading-relaxed">{description}</p>
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
