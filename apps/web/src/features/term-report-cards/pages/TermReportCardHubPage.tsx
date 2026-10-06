import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronRight, Search, X } from 'lucide-react';
import { matchesClassQuery } from '@/lib/classSearch';
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

  const [search, setSearch] = useState('');
  const allTiles = (schoolClasses ?? []).flatMap((c) =>
    (c.sections.length > 0 ? c.sections : ['—']).map((section) => ({ cls: c.name, section })),
  );
  const tiles = useMemo(
    () => allTiles.filter((t) => matchesClassQuery(search, t.cls, t.section)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schoolClasses, search],
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

      {allTiles.length > 0 && (
        <div className="relative mb-5 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder='Search class — e.g. "6 A" or "VI A"'
            className="w-full h-11 pl-10 pr-9 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
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
          {allTiles.length === 0 ? 'No classes set up yet.' : 'No classes match your search.'}
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
