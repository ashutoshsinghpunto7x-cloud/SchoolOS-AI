import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, ChevronDown, ChevronLeft, ChevronRight, Plus, Users,
  UserRound, Trash2, Pencil, IndianRupee,
} from 'lucide-react';
import { useEmployeeList, useDeleteEmployee } from '../hooks/useEmployees';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import type { EmployeeListOptions, EmployeeRole, EmployeeStatus } from '@schoolos/types';

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Teacher', principal: 'Principal', vice_principal: 'Vice Principal',
  receptionist: 'Receptionist', accountant: 'Accountant', librarian: 'Librarian',
  driver: 'Driver', peon: 'Peon', other: 'Other',
};

const selectCls =
  'h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 appearance-none pr-8';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EmployeeListOptions>({ page: 1, limit: PAGE_SIZE, status: 'active' });
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useEmployeeList(filters);
  const { mutateAsync: deleteEmployee } = useDeleteEmployee();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  function applySearch() {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from the employee directory?`)) return;
    setDeletingId(id);
    try {
      await deleteEmployee(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Employees</h1>
          <p className="text-xs text-gray-500">Manage staff records, QR attendance IDs, and ID cards</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Employee
        </button>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto space-y-4">
        {/* Search + filters */}
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
                value={filters.role ?? 'all'}
                onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value === 'all' ? undefined : (e.target.value as EmployeeRole), page: 1 }))}
                className={selectCls}
              >
                <option value="all">All Roles</option>
                {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filters.status ?? 'all'}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value === 'all' ? undefined : (e.target.value as EmployeeStatus), page: 1 }))}
                className={selectCls}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <button onClick={applySearch} className="h-10 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-sm font-semibold">
              Search
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <Users className="w-3.5 h-3.5" />
          {meta ? `${meta.total} employee${meta.total !== 1 ? 's' : ''}` : 'Loading…'}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <UserRound className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No employees found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different filter, or add a new employee.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((e) => (
              <div key={e._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                <button
                  onClick={() => navigate(`/admin/employees/${e._id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-[#A855F7]/10 flex items-center justify-center text-[#5B21B6] font-bold text-xs shrink-0 overflow-hidden">
                    {e.photoUrl ? (
                      <img src={e.photoUrl} alt={e.fullName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      initialsOf(e.fullName)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{e.fullName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${e.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {e.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {e.employeeId} · {ROLE_LABEL[e.role] ?? e.role} · {e.designation}{e.department && ` · ${e.department}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                      {e.phone && <span>{e.phone}</span>}
                      {typeof e.monthlySalary === 'number' && (
                        <span className="flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{e.monthlySalary.toLocaleString('en-IN')}/mo</span>
                      )}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => navigate(`/admin/employees/${e._id}`)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#5B21B6] hover:bg-[#A855F7]/10 shrink-0"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(e._id, e.fullName)}
                  disabled={deletingId === e._id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

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

      {showAddModal && <AddEmployeeModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
