import type { ScheduleEntry } from '../types';

interface ScheduleTimelineProps {
  schedule: ScheduleEntry[];
}

export function ScheduleTimeline({ schedule }: ScheduleTimelineProps) {
  if (schedule.length === 0) {
    return <p className="text-sm text-gray-500 py-4">Nothing scheduled yet.</p>;
  }

  return (
    <ol className="relative">
      {schedule.map((entry, i) => (
        <li key={entry._id} className="relative pl-6 pb-5 last:pb-0">
          {i !== schedule.length - 1 && (
            <span className="absolute left-[5px] top-3 bottom-0 w-px bg-gray-100" aria-hidden="true" />
          )}
          <span
            className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ${
              entry.isCurrent
                ? 'bg-purple-600'
                : entry.isDone
                  ? 'bg-gray-200'
                  : 'bg-gray-900'
            }`}
            aria-hidden="true"
          />
          <div className="flex items-baseline justify-between gap-3">
            <div className={entry.isDone ? 'opacity-50' : ''}>
              <p className="text-sm text-gray-500 tabular-nums">{entry.time}</p>
              <p className="text-base text-gray-900 mt-0.5">{entry.subject}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {entry.detail}
                {entry.teacher ? ` · ${entry.teacher}` : ''}
              </p>
            </div>
            {entry.isCurrent && (
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-full shrink-0">
                Now
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
