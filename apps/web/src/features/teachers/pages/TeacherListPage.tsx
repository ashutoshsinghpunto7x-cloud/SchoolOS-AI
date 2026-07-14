import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, ChevronLeft, ChevronRight, Loader2, MessageSquare, X, History } from 'lucide-react';
import { useTeachersPaginated } from '../hooks/useTeachers';
import { TeacherCard } from '../components/TeacherCard';
import { TeacherFilters } from '../components/TeacherFilters';
import { SendMessageModal } from '../components/SendMessageModal';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuditLogPanel } from '@/features/audit/components/AuditLogPanel';
import type { Teacher, TeacherListOptions } from '@schoolos/types';

const PAGE_SIZE = 18;

export const TeacherListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [filters, setFilters] = useState<TeacherListOptions>({ page: 1, limit: PAGE_SIZE });
  const [searchInput, setSearchInput] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selected, setSelected] = useState<Map<string, Teacher>>(new Map());
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const toggleSelect = (teacher: Teacher) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(teacher._id)) next.delete(teacher._id);
      else next.set(teacher._id, teacher);
      return next;
    });
  };

  const exitSelectMode = () => {
    setIsSelecting(false);
    setSelected(new Map());
  };

  const applySearch = (value: string) =>
    setFilters((f) => ({ ...f, search: value.trim() || undefined, page: 1 }));

  const { data, isLoading, isFetching, isError } = useTeachersPaginated(filters);

  const teachers   = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  const setPage = (page: number) => setFilters((f) => ({ ...f, page }));

  const hasActiveFilters = !!(filters.department || filters.subject || filters.status);

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Teachers"
        subtitle={meta ? `${meta.total} teacher${meta.total !== 1 ? 's' : ''} on record` : 'Loading…'}
        action={
          <div className="flex items-center gap-3">
            {isAdmin && (
              isSelecting ? (
                <button
                  onClick={exitSelectMode}
                  className="h-12 px-5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200
                             flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors duration-150"
                  type="button"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => setIsSelecting(true)}
                  className="h-12 px-5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200
                             flex items-center gap-2 text-sm font-bold text-gray-700 transition-colors duration-150"
                  type="button"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message Teachers
                </button>
              )
            )}
            {isAdmin && (
              <button
                onClick={() => setHistoryOpen(true)}
                className="h-12 px-5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200
                           flex items-center gap-2 text-sm font-bold text-gray-700 transition-colors duration-150"
                type="button"
              >
                <History className="w-4 h-4" />
                Activity Log
              </button>
            )}
            <button
              onClick={() => navigate('/teachers/new')}
              className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                         flex items-center gap-2 text-sm font-bold text-white transition-colors duration-150"
              type="button"
            >
              <UserPlus className="w-5 h-5" />
              Add Teacher
            </button>
          </div>
        }
      />

      {historyOpen && (
        <AuditLogPanel resource="teachers" title="Teacher Activity Log" onClose={() => setHistoryOpen(false)} />
      )}

      <div className="flex flex-col gap-3 mb-6">
        <SearchBar
          placeholder="Search by name, ID, phone, department…"
          value={searchInput}
          onChange={(val) => {
            setSearchInput(val);
            if (!val.trim()) applySearch('');
          }}
          onSearch={applySearch}
        />
        <TeacherFilters filters={filters} onChange={setFilters} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-52 animate-pulse" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <EmptyState icon={Users} title="Could not load teachers" description="Check your connection and try refreshing." />
      )}

      {!isLoading && !isError && teachers.length === 0 && (
        <EmptyState
          icon={Users}
          title={hasActiveFilters || filters.search ? 'No results found' : 'No teachers yet'}
          description={
            hasActiveFilters || filters.search
              ? 'Try adjusting your filters or search term.'
              : 'Add your first teacher by clicking Add Teacher above.'
          }
          action={
            hasActiveFilters || filters.search
              ? { label: 'Clear all', onClick: () => { setSearchInput(''); setFilters({ page: 1, limit: PAGE_SIZE }); }, variant: 'secondary' as const }
              : { label: 'Add Teacher', onClick: () => navigate('/teachers/new') }
          }
        />
      )}

      {!isLoading && !isError && teachers.length > 0 && (
        <>
          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" />Updating…
            </div>
          )}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            {teachers.map((teacher) => (
              <TeacherCard
                key={teacher._id}
                teacher={teacher}
                selectable={isSelecting}
                selected={selected.has(teacher._id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} · {meta!.total} teachers
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

      {isSelecting && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-gray-900 text-white rounded-2xl shadow-xl px-5 py-3">
          <span className="text-sm font-semibold">{selected.size} teacher{selected.size !== 1 ? 's' : ''} selected</span>
          <button
            onClick={() => setShowMessageModal(true)}
            className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2 text-sm font-bold transition-colors"
            type="button"
          >
            <MessageSquare className="w-4 h-4" />
            Send Message
          </button>
        </div>
      )}

      {showMessageModal && (
        <SendMessageModal
          teachers={Array.from(selected.values()).map((t) => ({ _id: t._id, fullName: t.fullName }))}
          onClose={() => { setShowMessageModal(false); exitSelectMode(); }}
        />
      )}
    </PageContainer>
  );
};
