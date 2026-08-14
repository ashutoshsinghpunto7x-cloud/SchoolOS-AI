import type { ScheduleEntry } from '../types';

interface ScheduleTimelineProps {
  schedule: ScheduleEntry[];
}

export function ScheduleTimeline({ schedule }: ScheduleTimelineProps) {
  if (schedule.length === 0) {
    return <p className="text-sm text-[#6B6B6B] py-4">Nothing scheduled yet.</p>;
  }

  return (
    <ol className="relative">
      {schedule.map((entry, i) => (
        <li key={entry._id} className="relative pl-6 pb-5 last:pb-0">
          {i !== schedule.length - 1 && (
            <span className="absolute left-[5px] top-3 bottom-0 w-px bg-[#E7E4DE]" aria-hidden="true" />
          )}
          <span
            className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ${
              entry.isCurrent
                ? 'bg-[#A6752F]'
                : entry.isDone
                  ? 'bg-[#E7E4DE]'
                  : 'bg-[#0D0D0D]'
            }`}
            aria-hidden="true"
          />
          <div className="flex items-baseline justify-between gap-3">
            <div className={entry.isDone ? 'opacity-50' : ''}>
              <p className="text-sm text-[#6B6B6B] tabular-nums">{entry.time}</p>
              <p className="text-base text-[#0D0D0D] mt-0.5">{entry.subject}</p>
              <p className="text-sm text-[#6B6B6B] mt-0.5">
                {entry.detail}
                {entry.teacher ? ` · ${entry.teacher}` : ''}
              </p>
            </div>
            {entry.isCurrent && (
              <span className="text-xs font-medium text-[#A6752F] bg-[#A6752F]/10 px-2 py-1 rounded-full shrink-0">
                Now
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
