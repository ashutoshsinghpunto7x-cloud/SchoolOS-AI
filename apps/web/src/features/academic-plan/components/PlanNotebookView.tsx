import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import type { MonthCalendarDay } from '../lib/monthCalendar';
import type { AcademicPlanDay, AcademicPlanMonthlyRow, EditPlanDayPayload } from '@schoolos/types';

// Notebook-format planner views — same columns as the paper Daily / Monthly planners teachers
// keep today. Both read from the existing AcademicPlan (the chapter/day engine stays the source
// of "what is taught when"); the extra columns are teacher-typed and saved on blur.

type NotebookField = 'periodLabel' | 'classWork' | 'homeWork' | 'teachingAid' | 'remarks';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #planner-print, #planner-print * { visibility: visible !important; }
  #planner-print { position: absolute; left: 0; top: 0; width: 100%; }
  #planner-print .no-print { display: none !important; }
  #planner-print textarea, #planner-print input { border: none !important; background: transparent !important; resize: none; }
}
@page { size: A4 landscape; margin: 10mm; }
`;

function EditableCell({
  value, onSave, readOnly, placeholder, rows = 2,
}: { value?: string; onSave: (v: string) => void; readOnly?: boolean; placeholder?: string; rows?: number }) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  if (readOnly) return <span className="whitespace-pre-wrap text-xs text-gray-700 dark:text-white/70">{value || '—'}</span>;
  return (
    <textarea
      value={draft}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft.trim() !== (value ?? '').trim()) onSave(draft.trim()); }}
      className="w-full min-w-[110px] text-xs rounded-md border border-transparent hover:border-gray-200 focus:border-[#6D4AFF] focus:outline-none bg-transparent px-1.5 py-1 resize-y text-gray-800 dark:text-white/80"
    />
  );
}

const TH = 'border border-gray-300 dark:border-white/15 px-2 py-1.5 text-left text-[11px] font-bold text-[#1C2B4A] dark:text-white/80 bg-[#F4F1FF] dark:bg-white/5';
const TD = 'border border-gray-200 dark:border-white/10 px-1.5 py-1 align-top text-xs';

function PrintButton() {
  return (
    <button
      type="button" onClick={() => window.print()}
      className="no-print h-8 px-3 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-white flex items-center gap-1.5"
    >
      <Printer className="w-3.5 h-3.5" /> Print
    </button>
  );
}

/** Daily Planner — Date/Day · Subject · Period · Topic · Class-work · Home-work · Teaching Aid · Remarks. */
export function NotebookDailyView({
  title, subject, days, readOnly, onSaveDay,
}: {
  title: string;
  subject: string;
  days: MonthCalendarDay[];
  readOnly?: boolean;
  onSaveDay: (day: AcademicPlanDay, patch: Partial<Pick<EditPlanDayPayload, NotebookField>>) => void;
}) {
  return (
    <div id="planner-print" className="bg-white dark:bg-transparent rounded-2xl border border-gray-100 dark:border-white/10 p-4 overflow-x-auto">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-sm font-bold text-[#1C2B4A] dark:text-white">Daily Planner · {title}</h2>
        <PrintButton />
      </div>
      <table className="w-full border-collapse min-w-[900px]">
        <thead>
          <tr>
            {['Date / Day', 'Subject', 'Period', 'Topic', 'Class-work', 'Home-work', 'Teaching Aid', 'Remarks'].map((h) => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((cd) => {
            const dateLabel = cd.date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
            const dayName = cd.date.toLocaleDateString(undefined, { weekday: 'long' });
            if (!cd.planDay) {
              return (
                <tr key={cd.dateKey} className="bg-gray-50 dark:bg-white/[0.03]">
                  <td className={TD}><p className="font-semibold">{dateLabel}</p><p className="text-gray-500">{dayName}</p></td>
                  <td className={`${TD} text-gray-400 italic`} colSpan={7}>{cd.offLabel}</td>
                </tr>
              );
            }
            const d = cd.planDay;
            const locked = readOnly || d.blockType === 'assessment';
            const topic = [d.chapterName ?? d.examName, d.topicTitle].filter(Boolean).join(' — ') || (d.blockType === 'buffer' ? 'Buffer / free period' : '—');
            return (
              <tr key={cd.dateKey}>
                <td className={TD}><p className="font-semibold">{dateLabel}</p><p className="text-gray-500">{dayName}</p></td>
                <td className={TD}>{subject}</td>
                <td className={TD}><EditableCell rows={1} value={d.periodLabel} readOnly={locked} placeholder="I" onSave={(v) => onSaveDay(d, { periodLabel: v })} /></td>
                <td className={TD}>
                  <p className="whitespace-pre-wrap">{topic}</p>
                  {d.blockType !== 'teach' && <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{d.blockType}</p>}
                </td>
                <td className={TD}><EditableCell value={d.classWork} readOnly={locked} placeholder="Class-work" onSave={(v) => onSaveDay(d, { classWork: v })} /></td>
                <td className={TD}><EditableCell value={d.homeWork} readOnly={locked} placeholder="Home-work" onSave={(v) => onSaveDay(d, { homeWork: v })} /></td>
                <td className={TD}><EditableCell value={d.teachingAid} readOnly={locked} placeholder="Teaching aid" onSave={(v) => onSaveDay(d, { teachingAid: v })} /></td>
                <td className={TD}><EditableCell value={d.remarks} readOnly={locked} placeholder="Remarks" onSave={(v) => onSaveDay(d, { remarks: v })} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface MonthChapterRow { chapterName: string; topics: string[]; }

/** Chapters taught in a month (in teaching order) with the topic titles scheduled for each. */
export function chaptersForMonth(days: AcademicPlanDay[], monthKey: string): MonthChapterRow[] {
  const rows = new Map<string, MonthChapterRow>();
  for (const d of days) {
    if (d.date.slice(0, 7) !== monthKey) continue;
    if (d.blockType !== 'teach' && d.blockType !== 'revision') continue;
    const name = d.chapterName ?? (d.blockType === 'revision' ? 'Revision' : undefined);
    if (!name) continue;
    const row = rows.get(name) ?? { chapterName: name, topics: [] };
    if (d.topicTitle && !row.topics.includes(d.topicTitle)) row.topics.push(d.topicTitle);
    rows.set(name, row);
  }
  return [...rows.values()];
}

/** Monthly Planner — Subject · Topic · Teaching Method · Teaching Aid · C/W · H/W. */
export function NotebookMonthlyView({
  title, subject, monthLabel, monthKey, days, monthlyRows, readOnly, onSaveRow,
}: {
  title: string;
  subject: string;
  monthLabel: string;
  monthKey: string;
  days: AcademicPlanDay[];
  monthlyRows: AcademicPlanMonthlyRow[];
  readOnly?: boolean;
  onSaveRow: (row: AcademicPlanMonthlyRow) => void;
}) {
  const chapters = chaptersForMonth(days, monthKey);
  const saved = (name: string) => monthlyRows.find((r) => r.monthKey === monthKey && r.chapterName === name);
  const save = (name: string, patch: Partial<AcademicPlanMonthlyRow>) =>
    onSaveRow({ ...(saved(name) ?? {}), monthKey, chapterName: name, ...patch });

  return (
    <div id="planner-print" className="bg-white dark:bg-transparent rounded-2xl border border-gray-100 dark:border-white/10 p-4 overflow-x-auto">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-sm font-bold text-[#1C2B4A] dark:text-white">Monthly Planner for {monthLabel} · {title}</h2>
        <PrintButton />
      </div>
      {chapters.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No lessons are scheduled in this month.</p>
      ) : (
        <table className="w-full border-collapse min-w-[860px]">
          <thead>
            <tr>
              {['Subject', 'Topic', 'Teaching Method', 'Teaching Aid', 'C/W', 'H/W'].map((h) => <th key={h} className={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {chapters.map((c) => {
              const row = saved(c.chapterName);
              return (
                <tr key={c.chapterName}>
                  <td className={TD}>{subject}</td>
                  <td className={TD}>
                    <p className="font-semibold">{c.chapterName}</p>
                    {c.topics.length > 0 && (
                      <ul className="list-disc pl-4 mt-0.5 text-gray-600 dark:text-white/60">
                        {c.topics.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                    )}
                  </td>
                  <td className={TD}><EditableCell rows={4} value={row?.teachingMethod} readOnly={readOnly} placeholder="Teaching method" onSave={(v) => save(c.chapterName, { teachingMethod: v })} /></td>
                  <td className={TD}><EditableCell rows={4} value={row?.teachingAid} readOnly={readOnly} placeholder="Teaching aid" onSave={(v) => save(c.chapterName, { teachingAid: v })} /></td>
                  <td className={TD}><EditableCell rows={4} value={row?.classWork} readOnly={readOnly} placeholder="Class-work" onSave={(v) => save(c.chapterName, { classWork: v })} /></td>
                  <td className={TD}><EditableCell rows={4} value={row?.homeWork} readOnly={readOnly} placeholder="Home-work" onSave={(v) => save(c.chapterName, { homeWork: v })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
