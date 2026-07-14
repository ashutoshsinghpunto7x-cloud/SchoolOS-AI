import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useStudentsPaginated } from '../hooks/useStudents';
import { StudentCard } from '../components/StudentCard';
import { StudentFilters } from '../components/StudentFilters';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { StudentListOptions } from '@schoolos/types';

const PAGE_SIZE = 18;

export const StudentListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<StudentListOptions>({ page: 1, limit: PAGE_SIZE });
  const [searchInput, setSearchInput] = useState('');

  // Debounce-free: apply search on Enter or clear
  const applySearch = (value: string) => {
    setFilters((f) => ({ ...f, search: value.trim() || undefined, page: 1 }));
  };

  const { data, isLoading, isFetching, isError } = useStudentsPaginated(filters);

  const students = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  const setPage = (page: number) => setFilters((f) => ({ ...f, page }));

  const hasActiveFilters = !!(
    filters.class || filters.section || filters.status || filters.gender
  );

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Students"
        subtitle={
          meta
            ? `${meta.total} student${meta.total !== 1 ? 's' : ''} registered`
            : 'Loading…'
        }
        action={
          <button
            onClick={() => navigate('/students/new')}
            className="h-12 px-6 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] active:bg-[#3f1a94]
                       flex items-center gap-2 text-sm font-bold text-white transition-colors duration-150"
            type="button"
          >
            <UserPlus className="w-5 h-5" />
            New Admission
          </button>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <SearchBar
          placeholder="Search by name, admission number, phone…"
          value={searchInput}
          onChange={(val) => {
            setSearchInput(val);
            if (!val.trim()) applySearch('');
          }}
          onSearch={applySearch}
        />
        <StudentFilters
          filters={filters}
          onChange={(updated) => setFilters(updated)}
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-52 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <EmptyState
          icon={Users}
          title="Could not load students"
          description="Check your connection and try refreshing."
        />
      )}

      {/* No results */}
      {!isLoading && !isError && students.length === 0 && (
        <EmptyState
          icon={Users}
          title={hasActiveFilters || filters.search ? 'No results found' : 'No students yet'}
          description={
            hasActiveFilters || filters.search
              ? 'Try adjusting your filters or search term.'
              : 'Add your first student by clicking New Admission above.'
          }
          action={
            hasActiveFilters || filters.search
              ? {
                  label: 'Clear all',
                  onClick: () => {
                    setSearchInput('');
                    setFilters({ page: 1, limit: PAGE_SIZE });
                  },
                  variant: 'secondary' as const,
                }
              : { label: 'New Admission', onClick: () => navigate('/students/new') }
          }
        />
      )}

      {/* Student grid */}
      {!isLoading && !isError && students.length > 0 && (
        <>
          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating…
            </div>
          )}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            {students.map((student) => (
              <StudentCard key={student._id} student={student} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} · {meta!.total} students
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={!meta?.hasPrevPage || isFetching}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
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
                      <span key={`ellipsis-${idx}`} className="h-10 w-10 flex items-center justify-center text-gray-400 text-sm">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item as number)}
                        disabled={isFetching}
                        className={`h-10 w-10 rounded-xl text-sm font-semibold transition-colors ${
                          currentPage === item
                            ? 'bg-[#5B21B6] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={!meta?.hasNextPage || isFetching}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
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
