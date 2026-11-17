import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAccountantDashboard } from '../hooks/useAccountantWorkspace';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const ACCOUNTANT_QUICK_LINKS: { label: string; path: string; d: string }[] = [
  { label: 'Collect Fee', path: '/accountant/collect-fee', d: 'M6 3h12M6 8h12M6 13l7 8M6 13h5a4 4 0 0 0 0-8H6' },
  { label: 'Fee Records', path: '/accountant/fee-records', d: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4' },
  { label: 'Pending Fees', path: '/accountant/pending-fees', d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { label: 'Fee Setup', path: '/accountant/fee-structure', d: 'M12 20V10M18 20V4M6 20v-4' },
  { label: 'Expenses', path: '/accountant/expenses', d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 10h8M8 14h6' },
  { label: 'Salary', path: '/accountant/salary', d: 'M2 7h20v10H2zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  { label: 'Vendors', path: '/accountant/vendors', d: 'M3 9l1-5h16l1 5M5 9v10h14V9M9 19v-5h6v5' },
  { label: 'Students', path: '/accountant/student-directory', d: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
  { label: 'Teachers', path: '/accountant/teachers', d: 'M3 4h18v11H3zM8 20l4-5 4 5M9 9h6' },
  { label: 'Employees', path: '/accountant/employees', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { label: 'Facilities', path: '/accountant/facility-requests', d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { label: 'Reports', path: '/accountant/reports', d: 'M3 3v18h18M7 16l4-4 4 4 5-6' },
];

export function AccountantDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAccountantDashboard();
  const firstName = user?.firstName ?? '';
  const card = 'bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs';

  const collectedTotal =
    (data?.todayCollected?.cash ?? 0) +
    (data?.todayCollected?.online ?? 0) +
    (data?.todayCollected?.bankTransfer ?? 0);
  const paidOutTotal =
    (data?.todayPaidOut?.cash ?? 0) +
    (data?.todayPaidOut?.online ?? 0) +
    (data?.todayPaidOut?.bankTransfer ?? 0);

  return (
    <div className="flex-1 w-full bg-[#FBF8F3] font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-[1100px] mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-[26px] md:text-[34px] font-medium text-[#1B2A4E] tracking-tight m-0">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#55607A] mt-1">
            Fee collections, expenses &amp; daily cash position.
          </p>
        </div>

        {isError && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-red-600">Failed to load dashboard.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="h-8 px-3 shrink-0 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick launch */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-3">
          {ACCOUNTANT_QUICK_LINKS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => navigate(q.path)}
              className="group flex flex-col items-center gap-1.5 text-[11px] sm:text-[12px] text-[#1B2A4E] font-medium cursor-pointer"
            >
              <span className="relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full bg-[#EEF1F8] flex items-center justify-center transition-all group-hover:-translate-y-[2px] group-hover:bg-[#E2E8F5]">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#254A9A" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d={q.d} />
                </svg>
              </span>
              <span className="text-center leading-tight">{q.label}</span>
            </button>
          ))}
        </div>

        {/* 3 Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/accountant/reports')}
            className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="text-[13px] text-[#55607A]">Net position today</div>
            <div className={`text-[32px] font-medium mt-1 ${(data?.todayCashBankSplit.total ?? 0) >= 0 ? 'text-[#1B2A4E]' : 'text-red-600'}`}>
              {isLoading ? '…' : fmt(data?.todayCashBankSplit.total ?? 0)}
            </div>
            <span className="text-[11px] font-semibold text-[#254A9A]">
              Cash + UPI + Bank transfer
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/accountant/fee-records')}
            className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="text-[13px] text-[#55607A]">Collected today</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">
              {isLoading ? '…' : fmt(collectedTotal)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">
              View fee records →
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/accountant/expenses')}
            className={`${card} p-5 text-left cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="text-[13px] text-[#55607A]">Paid out today</div>
            <div className="text-[32px] font-medium text-[#1B2A4E] mt-1">
              {isLoading ? '…' : fmt(paidOutTotal)}
            </div>
            <span className="text-[11px] font-semibold text-amber-600">
              Expenses &amp; vendor payouts →
            </span>
          </button>
        </div>

        {/* 2-Column Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between pb-1">
              <div className="text-[16px] font-bold text-[#1B2A4E]">Today&apos;s cash &amp; bank split</div>
              <button
                type="button"
                onClick={() => navigate('/accountant/reports')}
                className="text-[12px] font-semibold text-[#D9822B] hover:underline cursor-pointer"
              >
                View reports →
              </button>
            </div>
            {[
              { label: 'Cash', value: data?.todayCashBankSplit.cash ?? 0 },
              { label: 'UPI / Online', value: data?.todayCashBankSplit.online ?? 0 },
              { label: 'Bank Transfer', value: data?.todayCashBankSplit.bankTransfer ?? 0 },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60"
              >
                <span className="text-[14px] text-[#1B2A4E]">{row.label}</span>
                <b className={`text-[14px] font-bold ${row.value >= 0 ? 'text-[#1B2A4E]' : 'text-red-600'}`}>
                  {isLoading ? '—' : fmt(row.value)}
                </b>
              </div>
            ))}
          </div>

          <div className={`${card} p-5`}>
            <div className="text-[16px] font-bold text-[#1B2A4E] pb-1">Quick actions</div>
            {[
              { label: 'Collect student fee', tag: 'Fees', path: '/accountant/collect-fee' },
              { label: 'Review pending fee dues', tag: 'Dues', path: '/accountant/pending-fees' },
              { label: 'Record school expense', tag: 'Expense', path: '/accountant/expenses' },
              { label: 'Process staff salary & vendors', tag: 'Payouts', path: '/accountant/salary' },
            ].map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => navigate(r.path)}
                className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
              >
                <span className="text-[14px] text-[#1B2A4E]">{r.label}</span>
                <span className="px-2.5 h-6 rounded-full text-[11px] font-semibold bg-[#F3EEE3] text-[#55607A] flex items-center justify-center">
                  {r.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
