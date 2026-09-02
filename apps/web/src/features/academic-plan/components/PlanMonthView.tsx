import { ChevronRight, CalendarX2 } from 'lucide-react';
import { summarizeWeekLabels } from '../lib/monthCalendar';
import type { MonthCalendarWeek } from '../lib/monthCalendar';

/** Month tab: one condensed row per week — its date range plus the
 *  chapter(s)/exam(s) taught that week, no per-day breakdown (that detail
 *  lives on the Week tab). Tapping a week jumps to it there. */
export function PlanMonthView({ weeks, onSelectWeek }: {
  weeks: MonthCalendarWeek[];
  onSelectWeek: (weekStart: Date) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {weeks.map((week) => {
        const labels = summarizeWeekLabels(week.days);
        return (
          <button
            key={week.key}
            type="button"
            onClick={() => onSelectWeek(week.weekStart)}
            className="w-full text-left bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-3.5 flex items-center gap-3 hover:border-gray-200 dark:hover:border-white/20 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wide mb-1">
                Week of {week.rangeLabel}
              </p>
              {labels.length > 0 ? (
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{labels.join(' · ')}</p>
              ) : (
                <div className="flex items-center gap-1.5 text-gray-400 dark:text-white/30">
                  <CalendarX2 className="w-3.5 h-3.5" />
                  <p className="text-sm font-semibold">No lessons scheduled</p>
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
