import type { EventType } from '@schoolos/types';

const CONFIG: Record<EventType, { label: string; className: string; dot: string }> = {
  holiday:        { label: 'Holiday',        className: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  ptm:            { label: 'PTM',            className: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  examination:    { label: 'Examination',    className: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  school_event:   { label: 'School Event',   className: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  staff_meeting:  { label: 'Staff Meeting',  className: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  fee_due_date:   { label: 'Fee Due Date',   className: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  admission_event:{ label: 'Admission',      className: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-500' },
  general:        { label: 'General',        className: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
};

interface EventTypeBadgeProps {
  type: EventType;
  showDot?: boolean;
}

export const EventTypeBadge = ({ type, showDot = false }: EventTypeBadgeProps) => {
  const { label, className, dot } = CONFIG[type] ?? CONFIG.general;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
};

export const EVENT_TYPE_COLOR: Record<EventType, string> = {
  holiday:         'bg-green-500',
  ptm:             'bg-purple-500',
  examination:     'bg-red-500',
  school_event:    'bg-yellow-500',
  staff_meeting:   'bg-blue-500',
  fee_due_date:    'bg-orange-500',
  admission_event: 'bg-teal-500',
  general:         'bg-gray-400',
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = Object.fromEntries(
  Object.entries(CONFIG).map(([k, v]) => [k, v.label])
) as Record<EventType, string>;
