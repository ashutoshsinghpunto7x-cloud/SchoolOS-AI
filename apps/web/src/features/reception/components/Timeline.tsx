import { UserPlus, Phone, MessageCircle, UserCog, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export type TimelineEventType = 'admission' | 'call' | 'whatsapp' | 'update';

export interface TimelineEntry {
  id: string;
  type: TimelineEventType;
  title: string;
  subtitle: string;
  time: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  TimelineEventType,
  { icon: LucideIcon; dotBg: string; iconBg: string; iconColor: string }
> = {
  admission: {
    icon: UserPlus,
    dotBg: 'bg-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  call: {
    icon: Phone,
    dotBg: 'bg-green-500',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  whatsapp: {
    icon: MessageCircle,
    dotBg: 'bg-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  update: {
    icon: UserCog,
    dotBg: 'bg-indigo-500',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
};

// ── TimelineItem ─────────────────────────────────────────────────────────────

interface TimelineItemProps {
  entry: TimelineEntry;
  isLast: boolean;
}

const TimelineItem = ({ entry, isLast }: TimelineItemProps) => {
  const config = EVENT_CONFIG[entry.type];
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      {/* Left: dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 z-10',
            config.iconBg
          )}
        >
          <Icon className={cn('w-5 h-5', config.iconColor)} strokeWidth={1.75} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gray-100 mt-2 mb-1 min-h-[24px]" />
        )}
      </div>

      {/* Right: content */}
      <div className={cn('flex-1 min-w-0', !isLast && 'pb-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {entry.title}
            </p>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{entry.subtitle}</p>
          </div>
          <span className="flex-shrink-0 text-xs font-medium text-gray-400 mt-0.5 whitespace-nowrap">
            {entry.time}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineProps {
  entries: TimelineEntry[];
}

export const Timeline = ({ entries }: TimelineProps) => {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No activity yet today.
      </p>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <div className="flex flex-col">
        {entries.map((entry, index) => (
          <TimelineItem
            key={entry.id}
            entry={entry}
            isLast={index === entries.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
