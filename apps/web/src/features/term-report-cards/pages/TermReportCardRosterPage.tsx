import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, ChevronRight, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTermReportCardRoster } from '../hooks/useTermReportCard';

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function SkeletonRow() {
  return <div className="h-16 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />;
}

export function TermReportCardRosterPage() {
  const { cls = '', section = '', academicYear = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTermReportCardRoster(cls, section, academicYear);

  const templateNotPublished = data?.template && data.template.status !== 'published';

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
      <div className="px-5 pt-6 pb-4 max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 -ml-1 p-1" type="button">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[24px] font-bold text-gray-900 dark:text-white tracking-tight">Class {cls} – {section}</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-1">{academicYear} · Pick a student to generate their report card.</p>

        {templateNotPublished && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-amber-800">This class's report card template is still a draft — publish it before generating cards.</p>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-6">
          {isLoading ? (
            <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
          ) : isError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">Failed to load class roster — check that a report card template exists for this class and year.</p>
            </div>
          ) : (data?.rows.length ?? 0) === 0 ? (
            <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 p-8 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No active students in this class</p>
            </div>
          ) : (
            data!.rows.map((row) => (
              <button
                key={row.studentId} type="button"
                onClick={() => navigate(`/term-report-cards/${cls}/${section}/${academicYear}/student/${row.studentId}`)}
                className="w-full text-left flex items-center gap-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-[#F3EEFF]">
                  {row.photoUrl ? (
                    <img src={row.photoUrl} alt={row.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[13px] font-bold text-[#6D4AFF]">{initials(row.fullName)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{row.fullName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Roll {row.rollNumber ?? '—'}</p>
                </div>
                {row.warningsCount > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-1 shrink-0">
                    <AlertTriangle className="w-3 h-3" /> {row.warningsCount} warning{row.warningsCount === 1 ? '' : 's'}
                  </span>
                ) : row.hasReportCard ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Generated
                  </span>
                ) : null}
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
