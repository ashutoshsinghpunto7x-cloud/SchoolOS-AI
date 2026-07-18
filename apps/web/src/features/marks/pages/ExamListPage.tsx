import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useExamList, useDeleteExam } from '../hooks/useExams';
import { ExamStatusBadge, EXAM_TYPE_LABEL } from '../components/ExamStatusBadge';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import type { ExamListOptions, ExamStatus, ExamType } from '@schoolos/types';

const PAGE_SIZE = 20;

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'monthly_test', label: 'Monthly Test' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'practical', label: 'Practical' },
  { value: 'internal_assessment', label: 'Internal Assessment' },
  { value: 'other', label: 'Other' },
];

const STATUSES: { value: ExamStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'configured', label: 'Configured' },
  { value: 'locked', label: 'Locked' },
];

const selectClass =
  'h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 focus:border-[#A855F7] ' +
  'hover:border-gray-300 transition-colors cursor-pointer appearance-none';

export const ExamListPage = () => {
  const navigate = useNavigate();
  const { data: schoolClasses } = useSchoolClasses();
  const [filters, setFilters] = useState<ExamListOptions>({ page: 1, limit: PAGE_SIZE });
  const [searchInput, setSearchInput] = useState('');

  const applySearch = (value: string) => setFilters((f) => ({ ...f, search: value.trim() || undefined, page: 1 }));
  const set = (key: keyof ExamListOptions, value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));

  const { data, isLoading, isFetching, isError } = useExamList(filters);
  const { mutateAsync: deleteExam } = useDeleteExam();

  const exams = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;
  const setPage = (page: number) => setFilters((f) => ({ ...f, page }));

  const hasActiveFilters = !!(filters.class || filters.examType || filters.status);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteExam(id);
      toast.success('Exam deleted');
    } catch (err) {
      toast.error('Failed to delete exam', { description: err instanceof Error ? err.message : 'Please try again.' });
    }
  }

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Exams"
        subtitle={meta ? `${meta.total} exam${meta.total !== 1 ? 's' : ''} configured` : 'Loading…'}
        action={
          <button
            onClick={() => navigate('/exams/new')}
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 flex items-center text-sm font-bold text-white transition-colors duration-150"
            type="button"
          >
            New Exam
          </button>
        }
      />

      <div className="flex flex-col gap-3 mb-6">
        <SearchBar
          placeholder="Search by exam name…"
          value={searchInput}
          onChange={(val) => { setSearchInput(val); if (!val.trim()) applySearch(''); }}
          onSearch={applySearch}
        />
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.class ?? ''} onChange={(e) => set('class', e.target.value)} className={selectClass} aria-label="Filter by class">
            <option value="">All Classes</option>
            {(schoolClasses ?? []).map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
          </select>
          <select value={filters.examType ?? ''} onChange={(e) => set('examType', e.target.value)} className={selectClass} aria-label="Filter by exam type">
            <option value="">All Types</option>
            {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)} className={selectClass} aria-label="Filter by status">
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({ page: 1, limit: PAGE_SIZE })}
              className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-64 animate-pulse" />
      )}

      {isError && !isLoading && (
        <EmptyState icon={ClipboardList} title="Could not load exams" description="Check your connection and try refreshing." />
      )}

      {!isLoading && !isError && exams.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={hasActiveFilters || filters.search ? 'No results found' : 'No exams yet'}
          description={
            hasActiveFilters || filters.search
              ? 'Try adjusting your filters or search term.'
              : 'Create your first exam by clicking New Exam above.'
          }
          action={
            hasActiveFilters || filters.search
              ? { label: 'Clear all', onClick: () => { setSearchInput(''); setFilters({ page: 1, limit: PAGE_SIZE }); }, variant: 'secondary' as const }
              : { label: 'New Exam', onClick: () => navigate('/exams/new') }
          }
        />
      )}

      {!isLoading && !isError && exams.length > 0 && (
        <>
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" />Updating…
            </div>
          )}

          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/60">
                    <th className="px-5 py-3">Exam</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Classes</th>
                    <th className="px-5 py-3">Subjects</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr
                      key={exam._id}
                      className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/exams/${exam._id}/edit`)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900">{exam.name}</p>
                        {exam.termLabel && <p className="text-xs text-gray-400 mt-0.5">{exam.termLabel}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{EXAM_TYPE_LABEL[exam.examType]}</td>
                      <td className="px-5 py-3.5 text-gray-600">{exam.classesApplicable.map((c) => `Class ${c}`).join(', ') || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600 max-w-[220px] truncate" title={exam.subjects.join(', ')}>
                        {exam.subjects.join(', ') || '—'}
                      </td>
                      <td className="px-5 py-3.5"><ExamStatusBadge status={exam.status} /></td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {exam.status !== 'locked' && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(exam._id, exam.name)}
                            className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} · {meta!.total} exams
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(currentPage - 1)}
                  disabled={!meta?.hasPrevPage || isFetching}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | '…')[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`e-${idx}`} className="h-10 w-10 flex items-center justify-center text-gray-400 text-sm">…</span>
                    ) : (
                      <button key={item} type="button" onClick={() => setPage(item as number)}
                        disabled={isFetching}
                        className={`h-10 w-10 rounded-xl text-sm font-semibold transition-colors ${currentPage === item ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {item}
                      </button>
                    )
                  )}
                <button type="button" onClick={() => setPage(currentPage + 1)}
                  disabled={!meta?.hasNextPage || isFetching}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};
