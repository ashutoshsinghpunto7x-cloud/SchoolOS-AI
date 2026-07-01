import { useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineItem } from './TimelineItem';
import type { Communication, CommunicationType } from '@schoolos/types';

// ── Date grouping helpers ─────────────────────────────────────────────────────

const getDayLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

type Group = { label: string; items: Communication[] };

const groupByDay = (items: Communication[]): Group[] => {
  const map = new Map<string, Communication[]>();
  for (const item of items) {
    const label = getDayLabel(item.createdAt);
    const existing = map.get(label) ?? [];
    map.set(label, [...existing, item]);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
};

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterType = CommunicationType | 'all';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'call', label: 'Calls' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'note', label: 'Notes' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface CommunicationTimelineProps {
  communications: Communication[];
}

export const CommunicationTimeline = ({
  communications,
}: CommunicationTimelineProps) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all'
    ? communications
    : communications.filter((c) => c.type === filter);

  const hasCalls = communications.some((c) => c.type === 'call');
  const hasWhatsApp = communications.some((c) => c.type === 'whatsapp');
  const hasNotes = communications.some((c) => c.type === 'note');
  const hasMultipleTypes = [hasCalls, hasWhatsApp, hasNotes].filter(Boolean).length > 1;

  return (
    <div>
      {/* Filter tabs — only shown when there are multiple types */}
      {hasMultipleTypes && (
        <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-xl w-fit">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              type="button"
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                filter === value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {filter === 'all' ? 'No communications yet' : `No ${filter}s found`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'all'
              ? 'Start by calling or messaging the parent above.'
              : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupByDay(filtered).map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div>
                {group.items.map((communication, index) => (
                  <TimelineItem
                    key={communication._id}
                    communication={communication}
                    isLast={index === group.items.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
