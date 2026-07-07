import { Search, X } from 'lucide-react';
import type { EventType, EventStatus, EventAudience } from '@schoolos/types';
import { EVENT_TYPE_LABEL } from './EventTypeBadge';

const EVENT_TYPES: EventType[] = [
  'holiday', 'ptm', 'examination', 'school_event',
  'staff_meeting', 'fee_due_date', 'admission_event', 'general',
];

const EVENT_STATUSES: EventStatus[] = ['draft', 'scheduled', 'published', 'completed', 'cancelled'];

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft', scheduled: 'Scheduled', published: 'Published',
  completed: 'Completed', cancelled: 'Cancelled',
};

const AUDIENCES: { value: EventAudience; label: string }[] = [
  { value: 'all',      label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents',  label: 'Parents' },
  { value: 'staff',    label: 'Staff' },
];

export interface EventFiltersState {
  search: string;
  eventType: EventType | '';
  status: EventStatus | '';
  audience: EventAudience | '';
}

interface EventFiltersProps {
  filters: EventFiltersState;
  onChange: (filters: EventFiltersState) => void;
}

export const EventFilters = ({ filters, onChange }: EventFiltersProps) => {
  const set = <K extends keyof EventFiltersState>(key: K, value: EventFiltersState[K]) =>
    onChange({ ...filters, [key]: value });

  const hasActive =
    filters.search || filters.eventType || filters.status || filters.audience;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Search events…"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm
                     focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Type */}
      <select
        value={filters.eventType}
        onChange={(e) => set('eventType', e.target.value as EventType | '')}
        className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700
                   focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All Types</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => set('status', e.target.value as EventStatus | '')}
        className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700
                   focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All Status</option>
        {EVENT_STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>

      {/* Audience */}
      <select
        value={filters.audience}
        onChange={(e) => set('audience', e.target.value as EventAudience | '')}
        className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700
                   focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All Audiences</option>
        {AUDIENCES.map((a) => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>

      {/* Clear */}
      {hasActive && (
        <button
          type="button"
          onClick={() => onChange({ search: '', eventType: '', status: '', audience: '' })}
          className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-gray-200 bg-white
                     text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
};
