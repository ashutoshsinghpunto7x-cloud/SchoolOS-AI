import type { TeacherPlanner, PlannerProgress, PacePosition } from '@schoolos/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PlannerPrintDocumentProps {
  planner: TeacherPlanner;
  progress: PlannerProgress;
  pace: PacePosition;
  teacherName: string;
}

/** A4-shaped, print/PDF-ready rendering of the full plan — same "download
 *  via the browser's print dialog" pattern as worksheets/question papers/
 *  report cards use elsewhere, so a teacher can save or hand in a clean copy
 *  without a separate PDF-generation dependency. */
export function PlannerPrintDocument({ planner, progress, pace, teacherName }: PlannerPrintDocumentProps) {
  const totalTasks = planner.weeks.reduce((n, w) => n + w.tasks.length, 0);
  const completedTasks = planner.weeks.reduce((n, w) => n + w.tasks.filter((t) => t.status === 'completed').length, 0);

  return (
    <div className="bg-white p-10 space-y-5 text-gray-900" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="border-b-2 border-gray-800 pb-3">
        <p className="text-xl font-bold">Teaching Plan</p>
        <p className="text-sm text-gray-600 mt-0.5">
          {teacherName} · Class {planner.class} · {planner.subject}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Academic year {fmtDate(planner.academicYearStart)} – {fmtDate(planner.academicYearEnd)} · Generated {fmtDate(new Date().toISOString())}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          ['Year', progress.yearPercent],
          ['Half-Year', progress.halfYearPercent],
          ['Month', progress.monthPercent],
          ['This Week', progress.weekPercent],
        ].map(([label, pct]) => (
          <div key={label as string} className="border border-gray-200 rounded-lg py-2">
            <p className="text-lg font-bold">{pct}%</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600">
        <strong>{completedTasks}</strong> of <strong>{totalTasks}</strong> tasks completed overall ·{' '}
        {pace.teachingDaysBehind > 0
          ? `~${pace.teachingDaysBehind} teaching day(s) behind schedule`
          : pace.teachingDaysBehind < 0
          ? `~${Math.abs(pace.teachingDaysBehind)} teaching day(s) ahead of schedule`
          : 'on track with the plan'}
      </p>

      <div className="space-y-4">
        {planner.weeks.map((w) => (
          <div key={w.weekNumber} style={{ breakInside: 'avoid' }}>
            <p className="text-sm font-bold border-b border-gray-300 pb-1 mb-1.5">
              Week {w.weekNumber} — {w.chapterName}
              {w.topic && <span className="font-normal text-gray-500"> ({w.topic})</span>}
              <span className="font-normal text-gray-400"> · {fmtDate(w.startDate)} – {fmtDate(w.endDate)}</span>
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-gray-400 uppercase text-[10px]">
                  <th className="py-1 pr-2 w-24">Date</th>
                  <th className="py-1 pr-2">Task</th>
                  <th className="py-1 pr-2 w-28">Type</th>
                  <th className="py-1 w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {w.tasks.map((t) => (
                  <tr key={t.taskId} className="border-t border-gray-100">
                    <td className="py-1 pr-2 text-gray-600">{fmtDate(t.dueDate)}</td>
                    <td className="py-1 pr-2">{t.title}</td>
                    <td className="py-1 pr-2 text-gray-500">{labelize(t.type)}</td>
                    <td className="py-1">{t.status === 'completed' ? '✓ Done' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
