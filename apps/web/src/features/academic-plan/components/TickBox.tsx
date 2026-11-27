import { Check, Loader2, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Large checklist tick box (44px tap target). Without `onToggle` it is a
 *  read-only mark, which is what the Principal sees. */
export function TickBox({
  checked, partial, saving, onToggle, label,
}: {
  checked: boolean;
  /** Some — not all — of a group is done. */
  partial?: boolean;
  saving?: boolean;
  onToggle?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked ? true : partial ? 'mixed' : false}
      aria-label={label}
      title={label}
      disabled={!onToggle || saving}
      onClick={onToggle}
      className={cn('no-print-border w-11 h-11 -m-2 shrink-0 flex items-center justify-center', onToggle ? 'cursor-pointer' : 'cursor-default')}
    >
      <span
        className={cn(
          'w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors',
          checked ? 'bg-emerald-600 border-emerald-600 text-white'
            : partial ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
              : 'bg-white dark:bg-white/5 border-gray-300 dark:border-white/25',
        )}
      >
        {saving ? <Loader2 className={cn('w-4 h-4 animate-spin', !checked && 'text-gray-400')} />
          : checked ? <Check className="w-4.5 h-4.5" strokeWidth={3} />
            : partial ? <Minus className="w-4 h-4" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
