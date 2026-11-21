import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus2, Wallet, CheckCircle2 } from 'lucide-react';
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
  { label: 'Create Invoice', path: '/accountant?tab=invoice', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6' },
  { label: 'Other Payments', path: '/accountant?tab=other-payment', d: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { label: 'Fee Records', path: '/accountant/fee-records', d: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4' },
  { label: 'Pending Fees', path: '/accountant/pending-fees', d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { label: 'Fee Setup', path: '/accountant/fee-structure', d: 'M12 20V10M18 20V4M6 20v-4' },
  { label: 'Expenses', path: '/accountant/expenses', d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 10h8M8 14h6' },
  { label: 'Salary', path: '/accountant/salary', d: 'M2 7h20v10H2zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  { label: 'Vendors', path: '/accountant/vendors', d: 'M3 9l1-5h16l1 5M5 9v10h14V9M9 19v-5h6v5' },
  { label: 'Students', path: '/accountant/student-directory', d: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
  { label: 'Employees', path: '/accountant/employees', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { label: 'Reports', path: '/accountant/reports', d: 'M3 3v18h18M7 16l4-4 4 4 5-6' },
];

type DeskTab = 'overview' | 'invoice' | 'other-payment';

interface VoucherEntry {
  id: string;
  party: string;
  category: string;
  amount: number;
  mode: string;
  time: string;
}

const OTHER_PAYMENT_CATEGORIES = [
  'Facility / Hall Rent',
  'Swimming Pool',
  'Table Tennis',
  'After-School Sports & Clubs',
  'Transport / Bus Pass',
  'Uniform / Books / Misc',
];

export function AccountantDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAccountantDashboard();
  const firstName = user?.firstName ?? '';
  const card = 'bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs';

  const paramTab = searchParams.get('tab');
  const activeTab: DeskTab =
    paramTab === 'invoice' || paramTab === 'other-payment' ? paramTab : 'overview';

  const setTab = (tab: DeskTab) => {
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // Create Invoice (daily cash/voucher payments) state
  const [invParty, setInvParty] = useState('');
  const [invPurpose, setInvPurpose] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invMode, setInvMode] = useState('Cash');
  const [invoices, setInvoices] = useState<VoucherEntry[]>([]);
  const [invSaved, setInvSaved] = useState(false);

  // Accept Other Payment (non-fee receipts: rent, swimming, table tennis, etc.) state
  const [payFrom, setPayFrom] = useState('');
  const [payCategory, setPayCategory] = useState(OTHER_PAYMENT_CATEGORIES[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI / Online');
  const [otherReceipts, setOtherReceipts] = useState<VoucherEntry[]>([]);
  const [paySaved, setPaySaved] = useState(false);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(invAmount);
    if (!invParty.trim() || !amt || amt <= 0) return;
    setInvoices((prev) => [
      {
        id: `INV-${String(prev.length + 101)}`,
        party: invParty.trim(),
        category: invPurpose.trim() || 'Daily Cash Voucher',
        amount: amt,
        mode: invMode,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
    setInvParty('');
    setInvPurpose('');
    setInvAmount('');
    setInvSaved(true);
    setTimeout(() => setInvSaved(false), 3000);
  };

  const handleAcceptOtherPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!payFrom.trim() || !amt || amt <= 0) return;
    setOtherReceipts((prev) => [
      {
        id: `RCP-${String(prev.length + 201)}`,
        party: payFrom.trim(),
        category: payCategory,
        amount: amt,
        mode: payMode,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
    setPayFrom('');
    setPayAmount('');
    setPaySaved(true);
    setTimeout(() => setPaySaved(false), 3000);
  };

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
            Fee collections, daily invoices &amp; non-fee receipts.
          </p>
        </div>

        {/* Desk Mode Tabs: Overview | Create Invoice | Accept Other Payment */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'invoice' as const, label: 'Create Invoice', icon: FilePlus2 },
            { id: 'other-payment' as const, label: 'Accept Other Payment', icon: Wallet },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1B2A4E] text-white shadow-xs'
                    : 'bg-white border border-[#E8E2D6] text-[#55607A] hover:text-[#1B2A4E] hover:bg-[#EEF1F8]/60'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{t.label}</span>
              </button>
            );
          })}
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

        {activeTab === 'invoice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form onSubmit={handleCreateInvoice} className={`${card} p-5 sm:p-6 lg:col-span-7 space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1B2A4E]">Create Daily Invoice / Voucher</h2>
                  <p className="text-xs text-[#55607A] mt-0.5">
                    Issue an invoice for petty cash payouts, vendor bills, or daily disbursements.
                  </p>
                </div>
                <FilePlus2 className="w-5 h-5 text-[#254A9A] shrink-0" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Payee / Party Name</label>
                  <input
                    type="text"
                    required
                    value={invParty}
                    onChange={(e) => setInvParty(e.target.value)}
                    placeholder="e.g. Stationery Vendor / Staff"
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Purpose / Particulars</label>
                  <input
                    type="text"
                    value={invPurpose}
                    onChange={(e) => setInvPurpose(e.target.value)}
                    placeholder="e.g. Lab supplies, repair cash"
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Payment Mode</label>
                  <select
                    value={invMode}
                    onChange={(e) => setInvMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  >
                    <option>Cash</option>
                    <option>UPI / Online</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {invSaved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Invoice created
                  </span>
                ) : (
                  <span className="text-xs text-[#55607A]">Generates voucher number automatically</span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1B2A4E] hover:bg-[#254A9A] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Create Invoice
                </button>
              </div>
            </form>

            <div className={`${card} p-5 sm:p-6 lg:col-span-5`}>
              <div className="text-sm font-bold text-[#1B2A4E] mb-3">Today&apos;s Created Invoices</div>
              {invoices.length === 0 ? (
                <p className="text-xs text-[#55607A] py-8 text-center">
                  No invoices created yet in this session.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {invoices.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-b-0 border-[#E8E2D6]/60">
                      <div>
                        <div className="text-sm font-semibold text-[#1B2A4E]">{v.party}</div>
                        <div className="text-[11px] text-[#55607A]">{v.id} · {v.category} · {v.mode}</div>
                      </div>
                      <div className="text-sm font-bold text-[#1B2A4E]">{fmt(v.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'other-payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form onSubmit={handleAcceptOtherPayment} className={`${card} p-5 sm:p-6 lg:col-span-7 space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1B2A4E]">Accept Other Payment (Non-Fee)</h2>
                  <p className="text-xs text-[#55607A] mt-0.5">
                    Record rent, swimming, table tennis, after-school clubs, or miscellaneous receipts.
                  </p>
                </div>
                <Wallet className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Category</label>
                  <select
                    value={payCategory}
                    onChange={(e) => setPayCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  >
                    {OTHER_PAYMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Received From</label>
                  <input
                    type="text"
                    required
                    value={payFrom}
                    onChange={(e) => setPayFrom(e.target.value)}
                    placeholder="e.g. Student / Tenant / Member name"
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#55607A] mb-1">Payment Mode</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E8E2D6] bg-[#FBF8F3] text-sm text-[#1B2A4E] focus:outline-none focus:border-[#254A9A]"
                  >
                    <option>UPI / Online</option>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {paySaved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Receipt recorded
                  </span>
                ) : (
                  <span className="text-xs text-[#55607A]">Tracked separately from student tuition fees</span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Accept Payment
                </button>
              </div>
            </form>

            <div className={`${card} p-5 sm:p-6 lg:col-span-5`}>
              <div className="text-sm font-bold text-[#1B2A4E] mb-3">Recent Other Receipts</div>
              {otherReceipts.length === 0 ? (
                <p className="text-xs text-[#55607A] py-8 text-center">
                  No non-fee receipts recorded yet in this session.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {otherReceipts.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-b-0 border-[#E8E2D6]/60">
                      <div>
                        <div className="text-sm font-semibold text-[#1B2A4E]">{r.party}</div>
                        <div className="text-[11px] text-[#55607A]">{r.id} · {r.category} · {r.mode}</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-600">+{fmt(r.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <>
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
                  { label: 'Create daily invoice / voucher', tag: 'Invoice', path: '/accountant?tab=invoice' },
                  { label: 'Accept other payment (rent, swimming, TT)', tag: 'Other', path: '/accountant?tab=other-payment' },
                  { label: 'Review pending fee dues', tag: 'Dues', path: '/accountant/pending-fees' },
                  { label: 'Record school expense', tag: 'Expense', path: '/accountant/expenses' },
                ].map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => navigate(r.path)}
                    className="w-full flex items-center justify-between py-2.5 border-b last:border-b-0 border-[#E8E2D6]/60 text-left cursor-pointer hover:bg-[#FBF8F3] rounded-lg px-1"
                  >
                    <span className="text-[14px] text-[#1B2A4E]">{r.label}</span>
                    <span className="px-2.5 h-6 rounded-full text-[11px] font-semibold bg-[#F3EEE3] text-[#55607A] flex items-center justify-center shrink-0">
                      {r.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
