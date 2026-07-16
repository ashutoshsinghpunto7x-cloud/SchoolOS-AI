import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, RefreshCw, Ban, Loader2, Search } from 'lucide-react';
import { useEmployeeList, useRegenerateEmployeeQr, useDisableEmployeeQr } from '../hooks/useEmployees';
import type { Employee } from '@schoolos/types';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  disabled: 'bg-gray-100 text-gray-500 border-gray-200',
  expired:  'bg-amber-50 text-amber-700 border-amber-100',
  none:     'bg-gray-50 text-gray-400 border-gray-100',
};

function EmployeeQrRow({ employee }: { employee: Employee }) {
  const { mutateAsync: regenerate, isPending: regenerating } = useRegenerateEmployeeQr(employee._id);
  const { mutateAsync: disable, isPending: disabling } = useDisableEmployeeQr(employee._id);
  const status = employee.qr?.status ?? 'none';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center text-[#5B21B6] font-bold text-xs shrink-0 overflow-hidden">
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
        ) : (
          initialsOf(employee.fullName)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{employee.fullName}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{employee.employeeId} · {employee.designation}</p>
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize shrink-0 ${STATUS_STYLE[status]}`}>
        {status}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => regenerate()}
          disabled={regenerating}
          className="h-8 px-2.5 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
          title={employee.qr ? 'Regenerate QR' : 'Generate QR'}
        >
          {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {employee.qr ? 'Regen' : 'Generate'}
        </button>
        {employee.qr && status === 'active' && (
          <button
            onClick={() => disable()}
            disabled={disabling}
            className="h-8 px-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-60"
            title="Disable QR"
          >
            {disabling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
            Disable
          </button>
        )}
      </div>
    </div>
  );
}

export function QrManagementPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useEmployeeList({ limit: 100, status: 'active', search: search || undefined });
  const rows = data?.data ?? [];

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><QrCode className="w-4 h-4 text-gray-400" /> QR Management</h1>
          <p className="text-xs text-gray-500">Generate, regenerate, or disable staff attendance QR codes</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-3xl mx-auto space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput.trim())}
            placeholder="Search by name, employee ID, or phone"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No employees found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((e) => <EmployeeQrRow key={e._id} employee={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}
