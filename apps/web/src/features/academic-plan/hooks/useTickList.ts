import { useState } from 'react';
import { toast } from 'sonner';
import { useTickPlanDays } from './useAcademicPlan';
import type { AcademicPlanDayStatus } from '@schoolos/types';

export interface TickableDay {
  planId: string;
  date: string;
  status: AcademicPlanDayStatus;
}

const keyOf = (d: TickableDay) => `${d.planId}|${d.date}`;

/** Tick-box behaviour shared by the dashboard checklist and the planner screens:
 *  a tick shows at once, and rolls back with a message if saving fails. */
export function useTickList() {
  const { mutateAsync } = useTickPlanDays();
  // Ticks still on their way to the server, keyed by plan + date.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const isDone = (d: TickableDay) => pending[keyOf(d)] ?? d.status === 'completed';

  /** State of one row, which may stand for a whole day, week or month of lessons. */
  function groupState(days: TickableDay[]) {
    const done = days.filter(isDone).length;
    return {
      done,
      total: days.length,
      checked: days.length > 0 && done === days.length,
      partial: done > 0 && done < days.length,
      saving: days.some((d) => keyOf(d) in pending),
    };
  }

  async function toggle(days: TickableDay[]) {
    if (days.length === 0) return;
    const markDone = !days.every(isDone);
    if (!markDone && days.length > 1 && !window.confirm(`Un-tick all ${days.length} lessons?`)) return;
    const changing = days.filter((d) => isDone(d) !== markDone);
    const keys = changing.map(keyOf);
    setPending((p) => ({ ...p, ...Object.fromEntries(keys.map((k) => [k, markDone])) }));
    try {
      await mutateAsync({ status: markDone ? 'completed' : 'pending', days: changing });
    } catch (err) {
      toast.error('Could not save the tick', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setPending((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !keys.includes(k))));
    }
  }

  return { isDone, groupState, toggle };
}
