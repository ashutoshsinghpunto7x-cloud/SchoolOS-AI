import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMyChecklist } from '../hooks/useAcademicPlan';
import { useTickList } from '../hooks/useTickList';
import { addDays, isoDay, mondayOf, weekRangeLabel } from '../lib/monthCalendar';
import { TickBox } from './TickBox';
import type { AcademicPlanChecklistItem } from '@schoolos/types';

type Period = 'daily' | 'weekly' | 'monthly';
const PERIOD_LABELS: Record<Period, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const classLabel = (i: AcademicPlanChecklistItem) => `Class ${i.class}${i.section ? `-${i.section}` : ''} · ${i.subject}`;

function lessonTitle(i: AcademicPlanChecklistItem): string {
  if (i.blockType === 'revision') return `Revision — ${i.examName ?? i.chapterName ?? 'upcoming exam'}`;
  if (i.blockType === 'assessment') return i.examName ?? 'Assessment';
  return [i.chapterName, i.topicTitle].filter((v, n, all) => v && all.indexOf(v) === n).join(' — ') || 'Teaching period';
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return [...map.entries()];
}

type Ticks = ReturnType<typeof useTickList>;

function LessonRow({ item, ticks }: { item: AcademicPlanChecklistItem; ticks: Ticks }) {
  const state = ticks.groupState([item]);
  const title = lessonTitle(item);
  return (
    <li className="flex items-start gap-4 py-3">
      <TickBox checked={state.checked} saving={state.saving} onToggle={() => void ticks.toggle([item])}
        label={`Mark done: ${classLabel(item)}, ${title}`} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[14px] font-semibold', state.checked ? 'text-[#55607A] line-through' : 'text-[#1B2A4E] dark:text-white')}>
          {title}
        </p>
        <p className="text-[12px] text-[#55607A] dark:text-white/50">{classLabel(item)}</p>
        {item.classWork && <p className="text-[12px] text-[#55607A] dark:text-white/50 mt-0.5">Class-work: {item.classWork}</p>}
        {item.homeWork && <p className="text-[12px] text-[#55607A] dark:text-white/50">Home-work: {item.homeWork}</p>}
      </div>
    </li>
  );
}

/** Teacher dashboard checklist: today's lessons, this week day by day, and
 *  this month chapter by chapter. Every tick saves to the Academic Plan, so
 *  the Principal's screens show the same progress. */
export function MyChecklistCard({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('daily');
  const ticks = useTickList();

  const now = new Date();
  const today = isoDay(now);
  const weekStart = mondayOf(now);
  const week: [string, string] = [isoDay(weekStart), isoDay(addDays(weekStart, 6))];
  const month: [string, string] = [
    isoDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  ];
  const { data, isLoading, isError, refetch } = useMyChecklist(
    week[0] < month[0] ? week[0] : month[0],
    week[1] > month[1] ? week[1] : month[1],
  );

  const [from, to] = period === 'daily' ? [today, today] : period === 'weekly' ? week : month;
  const items = (data ?? []).filter((i) => i.dateKey >= from && i.dateKey <= to);
  const total = ticks.groupState(items);
  const percent = total.total ? Math.round((total.done / total.total) * 100) : 0;
  const subtitle = period === 'daily'
    ? now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
    : period === 'weekly'
      ? weekRangeLabel(weekStart)
      : now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <section className={className} aria-label="My checklist">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[16px] font-bold text-[#1B2A4E] dark:text-white">My checklist</h2>
          <p className="text-[12px] text-[#55607A] dark:text-white/50">{subtitle} · your ticks show on the Principal&apos;s screen</p>
        </div>
        <div className="flex items-center gap-1 bg-[#F3EEE3] dark:bg-white/5 rounded-xl p-1" role="tablist">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
              className={cn('h-9 px-4 rounded-lg text-[13px] cursor-pointer',
                period === p ? 'bg-white dark:bg-white/10 text-[#1B2A4E] dark:text-white font-bold shadow-sm' : 'text-[#55607A] dark:text-white/50 font-semibold')}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 mt-4 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      ) : isError ? (
        <p className="text-sm text-red-600 py-4">
          Could not load your checklist.{' '}
          <button type="button" onClick={() => void refetch()} className="font-semibold underline cursor-pointer">Retry</button>
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#55607A] dark:text-white/50 py-4">
          No lessons planned for this {period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}.{' '}
          <button type="button" onClick={() => navigate('/teacher/academic-plan')} className="font-semibold underline cursor-pointer">
            Open Academic Plan
          </button>
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-2.5 flex-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[13px] font-bold text-[#1B2A4E] dark:text-white">{total.done} of {total.total} done</p>
          </div>

          <div className="mt-2 max-h-[420px] overflow-y-auto px-2 -mx-2">
            {period === 'daily' ? (
              <ul className="divide-y divide-[#E8E2D6]/60 dark:divide-white/10">
                {items.map((i) => <LessonRow key={`${i.planId}|${i.date}`} item={i} ticks={ticks} />)}
              </ul>
            ) : period === 'weekly' ? (
              groupBy(items, (i) => i.dateKey).map(([dateKey, lessons]) => {
                const day = ticks.groupState(lessons);
                const dayLabel = new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
                return (
                  <div key={dateKey} className="pt-2">
                    <div className="flex items-center gap-4 py-2.5 px-2 -mx-2 rounded-lg bg-[#F3EEE3] dark:bg-white/5">
                      <TickBox checked={day.checked} partial={day.partial} saving={day.saving}
                        onToggle={() => void ticks.toggle(lessons)} label={`Mark all lessons done on ${dayLabel}`} />
                      <p className="flex-1 text-[13px] font-bold text-[#1B2A4E] dark:text-white">
                        {dayLabel}{dateKey === today ? ' · Today' : ''}
                      </p>
                      <p className="text-[12px] font-semibold text-[#55607A] dark:text-white/50">{day.done}/{day.total}</p>
                    </div>
                    <ul className="divide-y divide-[#E8E2D6]/60 dark:divide-white/10">
                      {lessons.map((i) => <LessonRow key={`${i.planId}|${i.date}`} item={i} ticks={ticks} />)}
                    </ul>
                  </div>
                );
              })
            ) : (
              <ul className="divide-y divide-[#E8E2D6]/60 dark:divide-white/10">
                {groupBy(items, (i) => `${i.planId}|${i.chapterName ?? lessonTitle(i)}`).map(([key, lessons]) => {
                  const group = ticks.groupState(lessons);
                  const title = lessons[0].chapterName ?? lessonTitle(lessons[0]);
                  return (
                    <li key={key} className="flex items-center gap-4 py-3">
                      <TickBox checked={group.checked} partial={group.partial} saving={group.saving}
                        onToggle={() => void ticks.toggle(lessons)} label={`Mark done: ${classLabel(lessons[0])}, ${title}`} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[14px] font-semibold', group.checked ? 'text-[#55607A] line-through' : 'text-[#1B2A4E] dark:text-white')}>{title}</p>
                        <p className="text-[12px] text-[#55607A] dark:text-white/50">{classLabel(lessons[0])}</p>
                      </div>
                      <p className="text-[12px] font-semibold text-[#55607A] dark:text-white/50 shrink-0">{group.done}/{group.total} lessons</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
