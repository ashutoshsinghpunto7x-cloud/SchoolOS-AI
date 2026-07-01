import { cn } from '@/lib/utils';

interface MiniBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
  formatted?: string;
}

export const MiniBar = ({ label, value, max, color = 'bg-blue-500', suffix = '', formatted }: MiniBarProps) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-gray-600 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
        {formatted ?? `${value}${suffix}`}
      </span>
    </div>
  );
};

interface MiniBarListProps {
  items: Array<{ label: string; count: number }>;
  color?: string;
  max?: number;
}

export const MiniBarList = ({ items, color, max }: MiniBarListProps) => {
  const maxVal = max ?? Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <MiniBar key={item.label} label={item.label} value={item.count} max={maxVal} color={color} />
      ))}
    </div>
  );
};
