import type { ReactNode } from 'react';

export type NotificationPriority = 'emergency' | 'high' | 'normal';

const PRIORITY_STYLES: Record<NotificationPriority, { stripe: string; chip: string; chipText: string; label: string }> = {
  emergency: { stripe: '#DC2626', chip: '#FEE2E2', chipText: '#B91C1C', label: 'Emergency' },
  high: { stripe: '#F97316', chip: '#FFEDD5', chipText: '#C2410C', label: 'High priority' },
  normal: { stripe: '#3B82F6', chip: '#DBEAFE', chipText: '#1D4ED8', label: 'Normal' },
};

interface NotificationCardProps {
  priority: NotificationPriority;
  categoryIcon: ReactNode;
  sender: string;
  body: string;
  time: string;
  expanded?: boolean;
  compact?: boolean;
}

// The Android 15 / Material 3 notification card — a coloured priority
// stripe replaces the old dot-and-emoji convention so severity reads at a
// glance without relying on colour alone (the label backs it up).
export const NotificationCard = ({ priority, categoryIcon, sender, body, time, expanded = false, compact = false }: NotificationCardProps) => {
  const p = PRIORITY_STYLES[priority];
  return (
    <div
      className="relative flex gap-3 rounded-[22px] bg-[#1c1c1e]/95 backdrop-blur-xl overflow-hidden"
      style={{ padding: compact ? '10px 14px 10px 16px' : '14px 16px 14px 18px' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: p.stripe }} />
      <div
        className="shrink-0 rounded-full flex items-center justify-center text-white"
        style={{ width: compact ? 30 : 34, height: compact ? 30 : 34, background: '#F97316' }}
      >
        {categoryIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px] font-semibold text-white/90 truncate">SchoolOS AI</span>
            <span className="text-white/40 text-[11px]">&middot;</span>
            <span className="text-[11px] text-white/50 shrink-0">{time}</span>
          </div>
        </div>
        <p className="text-[14px] font-semibold text-white leading-snug mt-0.5">{sender}</p>
        <p className={`text-[13px] text-white/75 leading-snug mt-0.5 ${expanded ? '' : 'line-clamp-2'}`}>{body}</p>
        <span
          className="inline-flex items-center mt-2 px-2 py-[3px] rounded-full text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: p.chip, color: p.chipText }}
        >
          {p.label}
        </span>
      </div>
    </div>
  );
};
