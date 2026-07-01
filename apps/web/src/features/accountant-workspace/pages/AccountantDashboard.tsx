import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, Clock, Wallet, Receipt, AlertCircle, ChevronRight,
  User2, ArrowUpRight, Plus, Search, Mail, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAccountantDashboard, useGroupedDefaulters } from '../hooks/useAccountantWorkspace';
import { SendDefaultersModal } from '../components/SendDefaultersModal';
import type { ClassDefaulterGroup } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Utilities ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayDateStr() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── KPI Card (clickable) ──────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, bg, color, onClick,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; bg: string; color: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[#5B5CEB]/30 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#5B5CEB] group-hover:translate-x-0.5 transition-all" />
      </div>
      <p className="text-xl font-bold text-gray-900 mt-3 truncate">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </button>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
      </div>
    </div>
  );
}

// ── Class defaulter group card ────────────────────────────────────────────────

function ClassGroupCard({ group, onSend }: { group: ClassDefaulterGroup; onSend: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.students : group.students.slice(0, 3);

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/60">
        <div>
          <p className="text-sm font-bold text-gray-800">Class {group.class}-{group.section}</p>
          <p className="text-[11px] text-gray-400">{group.students.length} pending · {fmt(group.totalBalance)}</p>
        </div>
        <button
          onClick={onSend}
          className="h-8 px-2.5 bg-[#5B5CEB]/10 hover:bg-[#5B5CEB]/20 text-[#5B5CEB] rounded-lg text-xs font-semibold flex items-center gap-1.5"
        >
          <Mail className="w-3 h-3" /> Send to Teacher
        </button>
      </div>
      {shown.map((d) => (
        <div key={d.feeRecordId} className="flex items-center gap-3 px-4 py-2.5">
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', d.daysOverdue > 0 ? 'bg-red-500' : 'bg-amber-500')} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{d.studentName}</p>
            <p className="text-[11px] text-gray-400">{d.daysOverdue > 0 ? `${d.daysOverdue}d overdue` : 'Due soon'}</p>
          </div>
          <p className={cn('text-xs font-bold shrink-0', d.daysOverdue > 0 ? 'text-red-600' : 'text-amber-600')}>{fmt(d.balance)}</p>
        </div>
      ))}
      {group.students.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600"
        >
          {expanded ? 'Show less' : `+${group.students.length - 3} more`}
          <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError } = useAccountantDashboard();
  const { data: groupedDefaulters, isLoading: defaultersLoading } = useGroupedDefaulters();
  const [sendingGroup, setSendingGroup] = useState<ClassDefaulterGroup | null>(null);

  const firstName = user?.firstName ?? 'Accountant';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Compact greeting bar ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{greeting()}, {firstName} 👋</h1>
            <p className="text-xs text-gray-400">{todayDateStr()}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-7xl mx-auto lg:px-8">

        {/* ── KPI cards (clickable) ──────────────────────────────────────── */}
        {isError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load dashboard. Please refresh.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={IndianRupee}
              label="Fees Collected Today"
              value={isLoading ? '—' : fmt(data?.feesCollectedToday ?? 0)}
              bg="bg-emerald-100" color="text-emerald-600"
              onClick={() => navigate('/accountant/reports')}
            />
            <KpiCard
              icon={Wallet}
              label="Pending Fees"
              value={isLoading ? '—' : fmt(data?.feeSummary.totalOutstanding ?? 0)}
              sub={data && data.feeSummary.overdueCount > 0 ? `${data.feeSummary.overdueCount} overdue` : undefined}
              bg="bg-amber-100" color="text-amber-600"
              onClick={() => navigate('/accountant/pending-fees')}
            />
            <KpiCard
              icon={Clock}
              label="Pending Salary"
              value={isLoading ? '—' : fmt(data?.salarySummary.totalPending ?? 0)}
              sub={data && data.salarySummary.pendingCount > 0 ? `${data.salarySummary.pendingCount} employees` : undefined}
              bg="bg-indigo-100" color="text-indigo-600"
              onClick={() => navigate('/accountant/salary')}
            />
            <KpiCard
              icon={Receipt}
              label="Pending Expenses"
              value={isLoading ? '—' : fmt(data?.expenseSummary.totalPending ?? 0)}
              sub={data && data.expenseSummary.pendingCount > 0 ? `${data.expenseSummary.pendingCount} requests` : undefined}
              bg="bg-rose-100" color="text-rose-600"
              onClick={() => navigate('/accountant/expenses')}
            />
          </div>
        )}

        {/* ── Main grid: Collect Fees + Class-wise Defaulters ───────────── */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Collect Fees — quick action */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-900">Collect Fees</h2>
            </div>
            <button
              onClick={() => navigate('/accountant/collect-fee')}
              className="w-full flex flex-col items-center justify-center gap-3 py-10 px-4 hover:bg-gray-50/60 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#5B5CEB]/10 flex items-center justify-center">
                <Search className="w-6 h-6 text-[#5B5CEB]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Search a student to collect fees</p>
                <p className="text-xs text-gray-400 mt-0.5">By name, class-section, or pending fee type</p>
              </div>
              <span className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#5B5CEB] text-white rounded-xl text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" /> Start Collection
              </span>
            </button>
          </section>

          {/* Fee Defaulters — class-wise */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-900">Fee Defaulters by Class</h2>
              <button
                onClick={() => navigate('/accountant/pending-fees')}
                className="text-xs font-semibold text-[#5B5CEB] flex items-center gap-0.5 hover:underline"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {defaultersLoading ? (
              <div className="divide-y divide-gray-50">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : !groupedDefaulters?.length ? (
              <div className="p-8 text-center text-sm text-gray-400">No pending fees 🎉</div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                {groupedDefaulters.map((g) => (
                  <ClassGroupCard key={`${g.class}-${g.section}`} group={g} onSend={() => setSendingGroup(g)} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Recent Activity ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
          </div>
          {isLoading ? (
            <div className="divide-y divide-gray-50">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : !data?.recentActivity.length ? (
            <div className="p-8 text-center text-sm text-gray-400">No recent activity</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recentActivity.map((a) => (
                <div key={a._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#5B5CEB]/10 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#5B5CEB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{a.description}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <User2 className="w-3 h-3" /> {a.performedBy} · {new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {sendingGroup && (
        <SendDefaultersModal group={sendingGroup} onClose={() => setSendingGroup(null)} />
      )}
    </div>
  );
}
