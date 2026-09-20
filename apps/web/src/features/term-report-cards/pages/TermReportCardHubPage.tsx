import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';

/** Derives the "2026-27" style label the report-card templates/cards key off of,
 *  straight from the Academic Year the principal already set in School Settings —
 *  so this page never asks anyone to retype a year that's configured elsewhere. */
function academicYearLabel(startIso?: string, endIso?: string): string {
  if (!startIso) return '';
  const startYear = new Date(startIso).getFullYear();
  const endYear = endIso ? new Date(endIso).getFullYear() : startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
}

export const TermReportCardHubPage = () => {
  const navigate = useNavigate();
  const { data: schoolClasses, isLoading } = useSchoolClasses();
  const { data: schoolSettings } = useSchoolSettings();

  const academicYear = academicYearLabel(schoolSettings?.academicYearStart, schoolSettings?.academicYearEnd);

  const tiles = (schoolClasses ?? []).flatMap((c) =>
    (c.sections.length > 0 ? c.sections : ['—']).map((section) => ({ cls: c.name, section })),
  );

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Term Report Cards"
        subtitle={academicYear ? `${academicYear} · Pick a class to open its roster.` : 'Pick a class to open its roster.'}
      />

      {!academicYear && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm font-semibold text-amber-800">
          Set the Academic Year in School Settings first — report cards are generated against it.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : tiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-500">
          No classes set up yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tiles.map(({ cls, section }) => (
            <button
              key={`${cls}-${section}`}
              type="button"
              disabled={!academicYear}
              onClick={() => navigate(`/term-report-cards/${cls}/${section}/${academicYear}`)}
              className="group text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F3EEFF] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#6D4AFF]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Class {cls}{section !== '—' ? ` – ${section}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-1.5 transition-all">
                View Roster <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </PageContainer>
  );
};
