import { toast } from 'sonner';
import { useTickPlanDays } from './useAcademicPlan';
import type { AcademicPlanDayStatus } from '@schoolos/types';

export interface TickableDay {
  planId: string;
  date: string;
  status: AcademicPlanDayStatus;
}

/** Tick-box behaviour shared by the dashboard checklist and the planner screens.
 *  The mutation patches the cached data instantly (and rolls back with a message
 *  if saving fails), so the tick never waits on the network. */
export function useTickList() {
  const { mutate } = useTickPlanDays();

  const isDone = (d: TickableDay) => d.status === 'completed';

  /** State of one row, which may stand for a whole day, week or month of lessons. */
  function groupState(days: TickableDay[]) {
    const done = days.filter(isDone).length;
    return {
      done,
      total: days.length,
      checked: days.length > 0 && done === days.length,
      partial: done > 0 && done < days.length,
      saving: false,
    };
  }

  function toggle(days: TickableDay[]) {
    if (days.length === 0) return;
    const markDone = !days.every(isDone);
    if (!markDone && days.length > 1 && !window.confirm(`Un-tick all ${days.length} lessons?`)) return;
    const changing = days.filter((d) => isDone(d) !== markDone);
    mutate(
      { status: markDone ? 'completed' : 'pending', days: changing },
      { onError: (err) => toast.error('Could not save the tick', { description: err instanceof Error ? err.message : undefined }) },
    );
  }

  return { isDone, groupState, toggle };
}
