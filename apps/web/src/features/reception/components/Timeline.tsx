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

const EVENT_CONFIG: Record<TimelineEventType, { dotBg: string }> = {
  admission: { dotBg: 'bg-blue-500' },
  call: { dotBg: 'bg-green-500' },
  whatsapp: { dotBg: 'bg-emerald-500' },
  update: { dotBg: 'bg-indigo-500' },
};

// ── TimelineItem ─────────────────────────────────────────────────────────────

interface TimelineItemProps {
  entry: TimelineEntry;
  isLast: boolean;
}

const TimelineItem = ({ entry, isLast }: TimelineItemProps) => {
  const config = EVENT_CONFIG[entry.type];

  return (
    <div className="flex gap-4">
      {/* Left: dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 z-10', config.dotBg)} />
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
