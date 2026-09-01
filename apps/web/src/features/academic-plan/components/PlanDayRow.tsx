import { BookOpen, RotateCcw, ClipboardCheck, Coffee, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AcademicPlanDay, AcademicPlanDayStatus } from '@schoolos/types';

const BLOCK_META: Record<AcademicPlanDay['blockType'], { icon: typeof BookOpen; bg: string; text: string; label: string }> = {
  teach:      { icon: BookOpen,       bg: 'bg-[#EAF6FF]',  text: 'text-[#0284C7]', label: 'Teach' },
  revision:   { icon: RotateCcw,      bg: 'bg-amber-50',   text: 'text-[#B5741C]', label: 'Revision' },
  assessment: { icon: ClipboardCheck, bg: 'bg-red-50',     text: 'text-[#A6432E]', label: 'Assessment' },
  buffer:     { icon: Coffee,         bg: 'bg-gray-50',    text: 'text-gray-400',  label: 'Free' },
};

const STATUS_OPTIONS: { value: AcademicPlanDayStatus; label: string; activeClass: string }[] = [
  { value: 'completed',         label: 'Completed',         activeClass: 'bg-[#20C997] text-white border-[#20C997]' },
  { value: 'partial',           label: 'Partial',            activeClass: 'bg-[#FFB547] text-white border-[#FFB547]' },
  { value: 'needs_extra_class', label: 'Need extra class',   activeClass: 'bg-[#A6432E] text-white border-[#A6432E]' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function PlanDayRow({
  day, showDate = true, onSetStatus, isSaving,
}: {
  day: AcademicPlanDay;
  showDate?: boolean;
  onSetStatus?: (status: AcademicPlanDayStatus) => void;
  isSaving?: boolean;
}) {
  const meta = BLOCK_META[day.blockType];
  const Icon = meta.icon;
  const title = day.blockType === 'teach'
    ? day.topicTitle ?? day.chapterName ?? 'Teaching period'
    : day.blockType === 'revision'
      ? `Revision — ${day.examName ?? 'upcoming exam'}`
      : day.blockType === 'assessment'
        ? day.examName ?? 'Assessment'
        : 'No period scheduled';

  return (
    <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm px-4 py-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
          <Icon className={cn('w-4.5 h-4.5', meta.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[11px] font-bold uppercase tracking-wide', meta.text)}>{meta.label}</span>
            {showDate && <span className="text-[11px] text-gray-400 dark:text-white/30">{formatDate(day.date)}</span>}
            {day.carriedFromDate && (
              <span className="text-[11px] text-amber-600 dark:text-amber-300 font-medium">carried forward</span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">{title}</p>
          {day.chapterName && day.blockType === 'teach' && day.topicTitle !== day.chapterName && (
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{day.chapterName}</p>
          )}
          {day.note && <p className="text-xs text-gray-400 dark:text-white/40 mt-1 italic">{day.note}</p>}
        </div>
        {day.status === 'completed' && (
          <span className="text-[11px] font-bold text-[#20C997] shrink-0">Done</span>
        )}
      </div>

      {onSetStatus && day.blockType !== 'buffer' && day.status !== 'completed' && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isSaving}
              onClick={() => onSetStatus(opt.value)}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50',
                day.status === opt.value ? opt.activeClass : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:border-gray-300',
              )}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
