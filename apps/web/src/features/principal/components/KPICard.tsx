import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  /** Omit to render the card as plain text with no icon badge. */
  icon?: LucideIcon;
  onClick?: () => void;
  delay?: number;
  /** Fixed-width, shorter card for the horizontal-scrolling dashboard row. */
  compact?: boolean;
  /** Tailwind classes for the icon badge — a distinct tint per card reads better
   *  as a scannable row than one repeated neutral color. */
  iconClassName?: string;
}

export const KPICard = ({ title, value, subtitle, icon: Icon, onClick, delay = 0, compact, iconClassName }: KPICardProps) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'bg-white rounded-[18px] border border-[#D8D8DC] shadow-[0_4px_24px_rgba(0,0,0,0.015)] text-left',
        'hover:border-[#A855F7]/25 hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)] transition-all duration-300',
        'flex flex-col justify-between',
        // Grows to fill whatever width the row has (laptop/monitor/TV) but never
        // shrinks below a usable size — the row scrolls horizontally instead.
        compact ? 'p-5 h-[150px] flex-1 min-w-[168px] snap-start' : 'p-6 h-[180px] w-full shrink-0',
      )}
    >
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase leading-tight">{title}</p>
          {Icon && (
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconClassName ?? 'bg-gray-100')}>
              <Icon className={cn('w-3.5 h-3.5', iconClassName ? '' : 'text-gray-400')} strokeWidth={2} />
            </div>
          )}
        </div>
        <p
          title={String(value)}
          className={cn('font-semibold text-gray-900 tracking-tight leading-none truncate', compact ? 'text-[26px]' : 'text-[34px]')}
        >
          {value}
        </p>
      </div>
      <p className="text-[12px] font-semibold text-gray-400 truncate">{subtitle}</p>
    </motion.button>
  );
};

export const KPICardSkeleton = ({ compact }: { compact?: boolean }) => (
  <div className={cn(
    'bg-white rounded-[18px] border border-[#D8D8DC] shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between animate-pulse',
    compact ? 'p-5 h-[150px] flex-1 min-w-[168px]' : 'p-6 h-[180px] shrink-0',
  )}>
    <div className="space-y-4">
      <div className="h-3 w-20 bg-gray-100 rounded" />
      <div className="h-8 w-24 bg-gray-100 rounded-md" />
    </div>
    <div className="h-3 w-16 bg-gray-100 rounded" />
  </div>
);
