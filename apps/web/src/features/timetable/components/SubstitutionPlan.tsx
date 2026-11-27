import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { NeedsSubstituteEntry, SubstituteSuggestion } from '@schoolos/types';
import {
  useCreateSubstitute,
  useNeedsSubstitute,
  usePeriodSlots,
  useSubstitutes,
  useSuggestSubstituteTeachers,
} from '../hooks/useTimetable';
import { SubstituteSuggestionList, suggestionDetail } from './SubstituteSuggestionList';

/** Local calendar date — toISOString() would give yesterday before 5:30am IST. */
export function localDateString(date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Whether the substitute has been alerted — if not, someone has to tell them. */
export function AlertStatus({ notified }: { notified?: boolean }) {
  if (notified === undefined) return null;
  return (
    <span className={`block text-[11px] ${notified ? 'text-emerald-700' : 'font-semibold text-red-600'}`}>
      {notified ? 'Urgent alert sent to their dashboard' : 'No alert sent (no app login) — please tell them'}
    </span>
  );
}

function PeriodRow({ entry, slotLabel }: { entry: NeedsSubstituteEntry; slotLabel: string }) {
  const query = {
    class: entry.class,
    section: entry.section,
    date: entry.date,
    slotId: entry.slotId,
    excludeTeacherId: entry.originalTeacherId,
  };
  const { data: suggestions, isLoading } = useSuggestSubstituteTeachers(query);
  const { mutate: create, isPending, error } = useCreateSubstitute();
  const [showAll, setShowAll] = useState(false);
  const best = suggestions?.[0];

  function assign(teacher: SubstituteSuggestion) {
    create({
      timetableId: entry.timetableId,
      class: entry.class,
      section: entry.section,
      date: entry.date,
      dayOfWeek: entry.dayOfWeek,
      slotId: entry.slotId,
      subjectName: entry.subjectName,
      originalTeacherId: entry.originalTeacherId,
      originalTeacherName: entry.originalTeacherName,
      substituteTeacherId: teacher.teacherId,
      substituteTeacherName: teacher.teacherName,
      reason: entry.absenceReason === 'leave' ? 'Approved leave' : 'Marked absent',
    });
  }

  return (
    <div className="py-2.5">
      <p className="text-[12px] font-semibold text-[#1B2A4E] m-0">
        {slotLabel} · Class {entry.class}-{entry.section} · {entry.subjectName}
      </p>

      {isLoading ? (
        <p className="text-xs text-gray-400 mt-1">Finding free teachers…</p>
      ) : !best ? (
        <p className="text-xs text-gray-400 mt-1">No teacher is free in this period.</p>
      ) : (
        <div className="mt-1.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[13px] text-[#1B2A4E] m-0">
              Suggested: <b>{best.teacherName}</b>
            </p>
            <p className="text-[11px] text-[#55607A] m-0">{suggestionDetail(best)}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="h-7 px-2.5 rounded-full text-[11px] font-semibold text-[#55607A] hover:bg-[#F5F1E8] cursor-pointer"
            >
              {showAll ? 'Close' : 'Other teachers'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => assign(best)}
              className="h-7 px-3 rounded-full bg-[#1B2A4E] hover:bg-[#15223E] text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Assign
            </button>
          </div>
        </div>
      )}

      {showAll && (
        <div className="mt-2">
          <SubstituteSuggestionList query={query} onPick={assign} disabled={isPending} />
        </div>
      )}
      {error && <p className="text-[11px] text-red-600 mt-1">{error.message}</p>}
    </div>
  );
}

/**
 * The substitution plan for one date: each period left without a teacher, with
 * the recommended substitute, followed by what has already been assigned.
 */
export const SubstitutionPlan = ({ date, hideWhenEmpty }: { date: string; hideWhenEmpty?: boolean }) => {
  const { data: needed, isLoading, error } = useNeedsSubstitute(date);
  const { data: subs } = useSubstitutes({ dateFrom: date, dateTo: date, limit: 100 });
  const { data: slots = [] } = usePeriodSlots();

  if (isLoading) return <p className="text-xs text-gray-400 py-2">Checking who is absent…</p>;
  if (error) return <p className="text-xs text-red-600 py-2">{error.message}</p>;

  const slotById = new Map(slots.map((s) => [s._id, s]));
  const order = (slotId: string) => slotById.get(slotId)?.orderIndex ?? 0;
  const label = (slotId: string) => slotById.get(slotId)?.name ?? 'Period';
  const assigned = (subs?.data ?? [])
    .filter((s) => s.status === 'active' && s.date.slice(0, 10) === date)
    .sort((a, b) => order(a.slotId) - order(b.slotId));

  const byTeacher = new Map<string, NeedsSubstituteEntry[]>();
  for (const entry of [...(needed ?? [])].sort((a, b) => order(a.slotId) - order(b.slotId))) {
    byTeacher.set(entry.originalTeacherId, [...(byTeacher.get(entry.originalTeacherId) ?? []), entry]);
  }

  if (hideWhenEmpty && !byTeacher.size && !assigned.length) return null;

  return (
    <div className="space-y-3">
      {byTeacher.size === 0 && (
        <p className="text-[13px] text-[#55607A] m-0">
          {assigned.length ? 'Every affected period is covered.' : 'No periods need a substitute.'}
        </p>
      )}

      {[...byTeacher.values()].map((entries) => (
        <div key={entries[0].originalTeacherId} className="rounded-xl border border-[#E8E2D6] bg-white px-3 py-2">
          <p className="text-[13px] font-bold text-[#1B2A4E] m-0">
            {entries[0].originalTeacherName}
            <span className="ml-2 text-[11px] font-semibold text-[#D9822B]">
              {entries[0].absenceReason === 'leave' ? 'On leave' : 'Absent'}
            </span>
          </p>
          <div className="divide-y divide-[#F0EBDF]">
            {entries.map((entry) => (
              <PeriodRow
                key={`${entry.class}-${entry.section}-${entry.slotId}`}
                entry={entry}
                slotLabel={label(entry.slotId)}
              />
            ))}
          </div>
        </div>
      ))}

      {assigned.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#55607A] m-0 mb-1">Assigned</p>
          {assigned.map((s) => (
            <p key={s._id} className="text-[12px] text-[#1B2A4E] m-0 py-0.5">
              {label(s.slotId)} · Class {s.class}-{s.section} → <b>{s.substituteTeacherName}</b>
              <AlertStatus notified={s.teacherNotified} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
