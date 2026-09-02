import { CalendarOff } from 'lucide-react';
import { PlanDayRow } from './PlanDayRow';
import type { MonthCalendarDay } from '../lib/monthCalendar';
import type { AcademicPlanDay, AcademicPlanDayStatus } from '@schoolos/types';

/** Week tab: every day of the selected week, in order — including
 *  Sundays/weekly-offs and school holidays, which never get a plan entry
 *  of their own (see monthCalendar.ts). Scheduled days show the chapter
 *  name only; edit still opens the full chapter/topic picker. */
export function PlanWeekView({
  days, cls, subject, savingDate, isPending, onSetStatus, onEdit, onMove,
}: {
  days: MonthCalendarDay[];
  cls?: string;
  subject?: string;
  savingDate: string | null;
  isPending: boolean;
  onSetStatus: (day: AcademicPlanDay, status: AcademicPlanDayStatus) => void;
  onEdit: (day: AcademicPlanDay, patch: { chapterId?: string; chapterName?: string; topicTitle?: string }) => void;
  onMove: (fromDate: string, toDate: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {days.map((cd) => {
        if (!cd.planDay) {
          return (
            <div
              key={cd.dateKey}
              className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 dark:border-white/10 px-4 py-2.5 opacity-70"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                <CalendarOff className="w-3.5 h-3.5 text-gray-300 dark:text-white/20" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-white/30">
                  {cd.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-xs text-gray-400 dark:text-white/30 truncate">{cd.offLabel}</p>
              </div>
            </div>
          );
        }
        const planDay = cd.planDay;
        return (
          <PlanDayRow
            key={cd.dateKey}
            day={planDay}
            cls={cls}
            subject={subject}
            showDate
            condensed
            onSetStatus={(status) => onSetStatus(planDay, status)}
            onEdit={(patch) => onEdit(planDay, patch)}
            onMove={(fromDate) => onMove(fromDate, planDay.date)}
            isSaving={savingDate === cd.dateKey && isPending}
          />
        );
      })}
    </div>
  );
}
