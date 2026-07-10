import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, ChevronLeft, ChevronRight, Users, FileSpreadsheet } from 'lucide-react';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import type { StudentListOptions } from '@schoolos/types';

const PAGE_SIZE = 20;

const selectCls =
  'h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-200 appearance-none pr-8';

export function StudentLedgerSearchPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<StudentListOptions>({ page: 1, limit: PAGE_SIZE, status: 'active' });
  const [searchInput, setSearchInput] = useState('');
  const [classInput, setClassInput] = useState('');

  const { data, isLoading } = useStudentsPaginated(filters);
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  function applySearch() {
    setFilters((f) => ({
      ...f,
      search: searchInput.trim() || undefined,
      class: classInput.trim() || undefined,
      page: 1,
    }));
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/accountant')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">Student Fee Ledger</h1>
          <p className="text-xs text-gray-500">Search a student to view their full fee ledger</p>
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
                placeholder="Admission no., name, phone, or guardian name"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <input
              type="text"
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Class"
              className="w-24 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <div className="relative">
              <select
                value={filters.status ?? 'all'}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value === 'all' ? undefined : (e.target.value as StudentListOptions['status']), page: 1 }))
                }
                className={selectCls}
              >
                <option value="all">All Students</option>
                <option value="active">Active</option>
                <option value="graduated">Graduated</option>
                <option value="transferred">Transferred</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={applySearch} className="h-10 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold">
              Search
            </button>
          </div>
        </div>

        {/* Stat */}
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <Users className="w-3.5 h-3.5" />
          {meta ? `${meta.total} matching student${meta.total !== 1 ? 's' : ''}` : 'Search to view results'}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No students found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different name, admission number, phone, or class.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {rows.map((s) => (
              <button
                key={s._id}
                onClick={() => navigate(`/accountant/student-ledger/${s._id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 font-bold text-xs shrink-0">
                  {s.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.fullName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.admissionNumber} · Class {s.class}-{s.section}
                    {s.parentPhone && ` · ${s.parentPhone}`}
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
