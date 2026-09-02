import { useState } from 'react';
import { BookOpen, RotateCcw, ClipboardCheck, Coffee, Loader2, Pencil, GripVertical, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChapters } from '@/features/question-bank/hooks/useQuestionBank';
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

interface DayEdit {
  chapterId?: string;
  chapterName?: string;
  topicTitle?: string;
}

export function PlanDayRow({
  day, cls, subject, showDate = true, condensed = false, onSetStatus, onEdit, onMove, isSaving,
}: {
  day: AcademicPlanDay;
  /** Class + subject this plan belongs to — only needed when `onEdit` is
   *  passed, to load that subject's chapters for the picker. */
  cls?: string;
  subject?: string;
  showDate?: boolean;
  /** Month view: title the row by chapter name alone and drop the topic
   *  sub-line — the day-by-day topic breakdown belongs to Today/This week. */
  condensed?: boolean;
  onSetStatus?: (status: AcademicPlanDayStatus) => void;
  /** Present only on the teacher's own (editable) view — omit for
   *  read-only viewers (e.g. Principal) to keep them view-only for free. */
  onEdit?: (patch: DayEdit) => void;
  onMove?: (fromDate: string) => void;
  isSaving?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draggedOver, setDraggedOver] = useState(false);
  const [chapterId, setChapterId] = useState(day.chapterId ?? '');
  const [topicTitle, setTopicTitle] = useState(day.topicTitle ?? '');
  const { data: chapters } = useChapters(cls ?? '', subject ?? '');

  const meta = BLOCK_META[day.blockType];
  const Icon = meta.icon;
  const title = day.blockType === 'teach'
    ? (condensed ? day.chapterName ?? day.topicTitle : day.topicTitle ?? day.chapterName) ?? 'Teaching period'
    : day.blockType === 'revision'
      ? `Revision — ${day.examName ?? 'upcoming exam'}`
      : day.blockType === 'assessment'
        ? day.examName ?? 'Assessment'
        : 'No period scheduled';

  const editable = !!onEdit && day.blockType !== 'assessment';
  const draggable = !!onMove && day.blockType !== 'assessment';

  function startEdit() {
    setChapterId(day.chapterId ?? '');
    setTopicTitle(day.topicTitle ?? day.chapterName ?? '');
    setEditing(true);
  }

  function saveEdit() {
    const chapter = (chapters ?? []).find((c) => c._id === chapterId);
    onEdit?.({
      chapterId: chapterId || undefined,
      chapterName: chapter?.chapterName ?? (chapterId ? day.chapterName : undefined),
      topicTitle: topicTitle.trim() || undefined,
    });
    setEditing(false);
  }

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => { if (draggable) e.dataTransfer.setData('text/plain', day.date); }}
      onDragOver={(e) => { if (onMove) { e.preventDefault(); setDraggedOver(true); } }}
      onDragLeave={() => setDraggedOver(false)}
      onDrop={(e) => {
        if (!onMove) return;
        e.preventDefault();
        setDraggedOver(false);
        const fromDate = e.dataTransfer.getData('text/plain');
        if (fromDate && fromDate !== day.date) onMove(fromDate);
      }}
      className={cn(
        'bg-white teacher-glass-card rounded-2xl border shadow-sm px-4 py-4 transition-colors',
        draggedOver ? 'border-[#6D4AFF] border-2' : 'border-gray-100 dark:border-transparent',
      )}
    >
      <div className="flex items-start gap-3">
        {draggable && (
          <GripVertical className="w-4 h-4 text-gray-300 dark:text-white/20 mt-2.5 shrink-0 cursor-grab" />
        )}
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
            {day.manuallyEdited && (
              <span className="text-[11px] text-[#6D4AFF] font-medium">edited</span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 flex flex-col gap-2">
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 text-sm text-gray-900 dark:text-white"
              >
                <option value="">No chapter (free text only)</option>
                {(chapters ?? []).map((c) => (
                  <option key={c._id} value={c._id}>{c.chapterName}</option>
                ))}
              </select>
              <input
                type="text"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Topic / lesson title"
                className="h-9 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 text-sm text-gray-900 dark:text-white"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <button type="button" onClick={saveEdit} disabled={isSaving}
                  className="h-8 px-3 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
                <button type="button" onClick={() => setEditing(false)}
                  className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-white/60 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">{title}</p>
              {!condensed && day.chapterName && day.blockType === 'teach' && day.topicTitle !== day.chapterName && (
                <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{day.chapterName}</p>
              )}
              {!condensed && day.note && <p className="text-xs text-gray-400 dark:text-white/40 mt-1 italic">{day.note}</p>}
            </>
          )}
        </div>
        {editable && !editing && (
          <button type="button" onClick={startEdit} aria-label="Edit this day"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:text-white/40 dark:hover:bg-white/5 shrink-0">
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {day.status === 'completed' && (
          <span className="text-[11px] font-bold text-[#20C997] shrink-0">Done</span>
        )}
      </div>

      {onSetStatus && day.blockType !== 'buffer' && day.status !== 'completed' && !editing && (
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
