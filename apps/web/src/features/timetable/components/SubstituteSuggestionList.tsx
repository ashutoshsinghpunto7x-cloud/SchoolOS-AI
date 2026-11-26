import { cn } from '@/lib/utils';
import { useSuggestSubstituteTeachers } from '../hooks/useTimetable';
import type { SubstituteSuggestionQuery } from '../api/timetable.api';
import type { SubstituteSuggestion } from '@schoolos/types';

export function suggestionDetail(s: SubstituteSuggestion): string {
  const free = `${s.freePeriodsToday} free ${s.freePeriodsToday === 1 ? 'period' : 'periods'} that day`;
  return s.teachesThisClass ? `Teaches this class · ${free}` : free;
}

interface Props {
  query: SubstituteSuggestionQuery;
  onPick: (teacher: SubstituteSuggestion) => void;
  selectedId?: string;
  disabled?: boolean;
}

/** Every teacher who is free for this period, in recommended order. */
export const SubstituteSuggestionList = ({ query, onPick, selectedId, disabled }: Props) => {
  const { data, isLoading, error } = useSuggestSubstituteTeachers(query);

  if (isLoading) return <p className="text-xs text-gray-400 py-2">Finding free teachers…</p>;
  if (error) return <p className="text-xs text-red-600 py-2">{error.message}</p>;
  if (!data?.length) return <p className="text-xs text-gray-400 py-2">No teacher is free in this period.</p>;

  return (
    <div className="max-h-44 overflow-y-auto rounded-xl border border-[#E8E2D6] bg-white divide-y divide-[#F0EBDF]">
      {data.map((teacher, index) => (
        <button
          key={teacher.teacherId}
          type="button"
          disabled={disabled}
          aria-pressed={selectedId === teacher.teacherId}
          onClick={() => onPick(teacher)}
          className={cn(
            'w-full flex items-center justify-between gap-3 px-3 py-2 text-left cursor-pointer transition-colors disabled:opacity-50',
            selectedId === teacher.teacherId ? 'bg-[#EEF1F8]' : 'hover:bg-[#FBF8F3]',
          )}
        >
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-[#1B2A4E] truncate">{teacher.teacherName}</span>
            <span className="block text-[11px] text-[#55607A]">{suggestionDetail(teacher)}</span>
          </span>
          {index === 0 && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#D9822B]">Recommended</span>
          )}
        </button>
      ))}
    </div>
  );
};
