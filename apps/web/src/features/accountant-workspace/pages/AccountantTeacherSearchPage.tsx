import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, ChevronLeft, ChevronRight, Users, UserRound } from 'lucide-react';
import { useTeachersPaginated } from '@/features/teachers/hooks/useTeachers';
import type { TeacherListOptions } from '@schoolos/types';

const PAGE_SIZE = 20;

const selectCls =
  'h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 appearance-none pr-8';

export function AccountantTeacherSearchPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TeacherListOptions>({ page: 1, limit: PAGE_SIZE, status: 'active' });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useTeachersPaginated(filters);
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/accountant')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">Teachers</h1>
          <p className="text-xs text-gray-500">Search a teacher to view their profile and manage their photo</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="Name, employee ID, or phone"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
              />
            </div>
            <div className="relative">
              <select
                value={filters.status ?? 'all'}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value === 'all' ? undefined : (e.target.value as TeacherListOptions['status']), page: 1 }))
                }
                className={selectCls}
              >
                <option value="all">All Teachers</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="resigned">Resigned</option>
                <option value="retired">Retired</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={applySearch} className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-sm font-semibold">
              Search
            </button>
          </div>
        </div>

        {/* Stat */}
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <Users className="w-3.5 h-3.5" />
          {meta ? `${meta.total} matching teacher${meta.total !== 1 ? 's' : ''}` : 'Search to view results'}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <UserRound className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No teachers found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different name, employee ID, or phone.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
            {rows.map((t) => (
              <button
                key={t._id}
                onClick={() => navigate(`/accountant/teachers/${t._id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#A855F7]/10 flex items-center justify-center text-[#5B21B6] font-bold text-xs shrink-0 overflow-hidden">
                  {t.photoUrl ? (
                    <img src={t.photoUrl} alt={t.fullName} className="w-full h-full object-cover" />
                  ) : (
                    t.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.fullName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.employeeId}{t.department && ` · ${t.department}`}{t.phone && ` · ${t.phone}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button
              disabled={currentPage <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: currentPage - 1 }))}
              className="h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <p className="text-xs text-gray-400">Page {currentPage} of {totalPages}</p>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: currentPage + 1 }))}
              className="h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 disabled:opacity-40 flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
