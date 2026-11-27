import { ChevronRight, CalendarX2 } from 'lucide-react';
import { summarizeWeekLabels } from '../lib/monthCalendar';
import { TickBox } from './TickBox';
import type { MonthCalendarWeek } from '../lib/monthCalendar';
import type { AcademicPlanDay } from '@schoolos/types';

/** Month tab: one condensed row per week — its date range plus the
 *  chapter(s)/exam(s) taught that week, no per-day breakdown (that detail
 *  lives on the Week tab). Tapping a week jumps to it there. */
export function PlanMonthView({ weeks, onSelectWeek, tickFor }: {
  weeks: MonthCalendarWeek[];
  onSelectWeek: (weekStart: Date) => void;
  tickFor: (days: AcademicPlanDay[]) => { done: number; total: number; checked: boolean; partial: boolean; saving: boolean; onToggle: () => void };
}) {
  return (
    <div className="flex flex-col gap-2">
      {weeks.map((week) => {
        const labels = summarizeWeekLabels(week.days);
        const lessons = week.days.flatMap((d) => (d.planDay && d.planDay.blockType !== 'buffer' ? [d.planDay] : []));
        const { done, total, ...tick } = tickFor(lessons);
        return (
          <div
            key={week.key}
            className="w-full bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-3.5 flex items-center gap-4 hover:border-gray-200 dark:hover:border-white/20 transition-colors"
          >
            {total > 0 && <TickBox {...tick} label={`Mark the week of ${week.rangeLabel} done`} />}
            <button type="button" onClick={() => onSelectWeek(week.weekStart)} className="flex-1 min-w-0 text-left flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wide mb-1">
                Week of {week.rangeLabel}{total > 0 ? ` · ${done}/${total} done` : ''}
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
          </div>
        );
      })}
    </div>
  );
}
