import { cn } from '@/lib/utils';
import type { AcademicPlanPrincipalOverviewEntry } from '@schoolos/types';

type Periods = NonNullable<AcademicPlanPrincipalOverviewEntry['periods']>;

const LABELS: [keyof Periods, string][] = [['today', 'Today'], ['week', 'This week'], ['month', 'This month']];

/** Adds up the ticked-lesson counts across several class/subject plans. */
export function sumPeriods(entries: AcademicPlanPrincipalOverviewEntry[]): Periods {
  const total: Periods = { today: { done: 0, total: 0 }, week: { done: 0, total: 0 }, month: { done: 0, total: 0 } };
  for (const e of entries) {
    for (const [key] of LABELS) {
      total[key].done += e.periods?.[key].done ?? 0;
      total[key].total += e.periods?.[key].total ?? 0;
    }
  }
  return total;
}

/** "Today 2/5 · This week 18/30" — what the teacher has ticked off so far. */
export function PeriodCounts({ periods }: { periods?: Periods }) {
  if (!periods) return null;
  return (
    <span className="flex flex-wrap gap-1.5 mt-1.5">
      {LABELS.map(([key, label]) => {
        const { done, total } = periods[key];
        return (
          <span key={key}
            className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
              total > 0 && done === total
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60')}>
            {label} {total === 0 ? '—' : `${done}/${total}`}
          </span>
        );
      })}
    </span>
  );
}
