import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Receipt, Store, FilePlus2, IndianRupee, Banknote, CreditCard, Landmark,
} from 'lucide-react';
import { useAccountantDashboard } from '../hooks/useAccountantWorkspace';

// ── Utilities ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const navigate = useNavigate();
  // Single source of truth for every number on this page — one GET request.
  // See useAccountantDashboard() in ../hooks/useAccountantWorkspace.ts.
  const { data, isLoading, isError, refetch } = useAccountantDashboard();

  return (
    <div className="min-h-screen bg-white">

      <div className="p-8 space-y-6 w-full">

        {/* ── Quick actions — the four things an accountant starts their day
            doing. No data of its own; pure navigation shortcuts. ──────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Collect Fee',      icon: IndianRupee, path: '/accountant/collect-fee' },
            { label: 'Record Expense',   icon: Receipt,     path: '/accountant/expenses' },
            { label: 'Add Vendor',       icon: Store,       path: '/accountant/vendors' },
            { label: 'Record Purchase',  icon: FilePlus2,   path: '/accountant/vendors' },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.path)}
              className="flex items-center gap-2.5 h-14 px-4 rounded-[14px] bg-white border border-[#E8E8E8] hover:border-[#A855F7]/30 hover:shadow-[0_4px_16px_rgba(168,85,247,0.08)] transition-all"
            >
              <span className="w-8 h-8 rounded-lg bg-[#A855F7]/10 flex items-center justify-center shrink-0">
                <action.icon className="w-4 h-4 text-[#5B21B6]" strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-semibold text-gray-800">{action.label}</span>
            </button>
          ))}
        </div>

        {/* ── Today's Position — net cash/bank split (fee collections in,
            minus expenses and vendor payments out), by payment mode. ──────── */}
        {!isError && (
          <div className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Today's Position</h2>
                <p className="text-[12px] text-gray-400 font-medium mt-0.5">Net cash/bank movement — collections minus expenses and vendor payments</p>
              </div>
              <p className={`text-2xl font-bold ${((data?.todayCashBankSplit.total ?? 0) >= 0) ? 'text-gray-900' : 'text-red-600'}`}>
                {isLoading ? '—' : fmt(data?.todayCashBankSplit.total ?? 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Cash',    icon: Banknote,   value: data?.todayCashBankSplit.cash },
                { label: 'UPI/Online', icon: CreditCard, value: data?.todayCashBankSplit.online },
                { label: 'Bank Transfer', icon: Landmark, value: data?.todayCashBankSplit.bankTransfer },
              ].map((row) => (
                <div key={row.label} className="rounded-xl bg-gray-50 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    <row.icon className="w-3.5 h-3.5" /> {row.label}
                  </div>
                  <p className={`text-lg font-bold mt-1 ${((row.value ?? 0) >= 0) ? 'text-gray-900' : 'text-red-600'}`}>
                    {isLoading ? '—' : fmt(row.value ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard-load error — retained even though the KPI cards it used
            to sit beside were removed, since it's the only failure surface
            for useAccountantDashboard() on this page. */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-[18px] p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Failed to load dashboard.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-2 h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
