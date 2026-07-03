import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ChevronRight, MoreHorizontal, MessageSquare,
} from 'lucide-react';
import { useAccountantDashboard, useGroupedDefaulters } from '../hooks/useAccountantWorkspace';
import { SendDefaultersModal } from '../components/SendDefaultersModal';
import type { ClassDefaulterGroup, FeeDefaulter } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Utilities ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, trendLabel, onClick,
}: {
  label: string; value: string; trendLabel: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-300 shadow-sm p-4 text-left hover:border-[#5B5CEB]/40 hover:shadow-md transition-all duration-200"
    >
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight truncate">{value}</p>
      <p className="text-xs text-gray-400 mt-1.5">{trendLabel}</p>
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="w-16 h-3 bg-gray-100 rounded" />
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ d }: { d: FeeDefaulter }) {
  if (d.daysOverdue > 0) {
    return (
      <span className="inline-flex h-[22px] items-center px-2.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold whitespace-nowrap border border-red-100">
        Overdue
      </span>
    );
  }
  const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86_400_000);
  if (days <= 7) {
    return (
      <span className="inline-flex h-[22px] items-center px-2.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-semibold whitespace-nowrap border border-amber-100">
        Due Soon
      </span>
    );
  }
  return (
    <span className="inline-flex h-[22px] items-center px-2.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-semibold whitespace-nowrap border border-emerald-100">
      Normal
    </span>
  );
}

function avatarInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return `${p[0]?.[0] ?? ''}${p[1]?.[0] ?? ''}`.toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-blue-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
];

// ── KPI CONFIG ────────────────────────────────────────────────────────────────

function buildKpiCards(data: ReturnType<typeof useAccountantDashboard>['data'], isLoading: boolean) {
  return [
    {
      key: 'fees-collected',
      label: 'Fees Collected Today',
      value: isLoading ? '—' : fmt(data?.feesCollectedToday ?? 0),
      trendLabel: (data?.feesCollectedToday ?? 0) > 0 ? 'Updated today' : 'No change',
      path: '/accountant/reports',
    },
    {
      key: 'pending-fees',
      label: 'Pending Fees',
      value: isLoading ? '—' : fmt(data?.feeSummary.totalOutstanding ?? 0),
      trendLabel: data && data.feeSummary.overdueCount > 0 ? `${data.feeSummary.overdueCount} overdue` : 'No change',
      path: '/accountant/pending-fees',
    },
    {
      key: 'pending-salary',
      label: 'Pending Salary',
      value: isLoading ? '—' : fmt(data?.salarySummary.totalPending ?? 0),
      trendLabel: data && data.salarySummary.pendingCount > 0 ? `${data.salarySummary.pendingCount} employees` : 'No change',
      path: '/accountant/salary',
    },
    {
      key: 'pending-expenses',
      label: 'Pending Expenses',
      value: isLoading ? '—' : fmt(data?.expenseSummary.totalPending ?? 0),
      trendLabel: data && data.expenseSummary.pendingCount > 0 ? `${data.expenseSummary.pendingCount} requests` : 'No change',
      path: '/accountant/expenses',
    },
  ];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAccountantDashboard();
  const { data: groupedDefaulters, isLoading: defaultersLoading } = useGroupedDefaulters();
  const [sendingGroup, setSendingGroup] = useState<ClassDefaulterGroup | null>(null);

  const topDefaulters = useMemo(
    () => [...(data?.defaulters ?? [])].sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 5),
    [data?.defaulters],
  );

  const groupFor = (classLabel: string, section: string) =>
    groupedDefaulters?.find((g) => g.class === classLabel && g.section === section) ?? null;

  const kpiCards = buildKpiCards(data, isLoading);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="px-4 py-5 space-y-5 max-w-7xl mx-auto lg:px-8">

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        {isError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load dashboard. Please refresh.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiCards.map((card) => (
              <KpiCard
                key={card.key}
                label={card.label}
                value={card.value}
                trendLabel={card.trendLabel}
                onClick={() => navigate(card.path)}
              />
            ))}
          </div>
        )}

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Collect Fees */}
          <button
            type="button"
            onClick={() => navigate('/accountant/collect-fee')}
            className="bg-white rounded-2xl border border-gray-300 shadow-sm p-5 text-left hover:border-[#5B5CEB]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-bold text-gray-900">Collect Fees</h2>
              <p className="text-xs text-gray-400 mt-0.5">Search a student and collect fees instantly</p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#5B5CEB]">Go to Collect Fees</span>
              <ChevronRight className="w-4 h-4 text-[#5B5CEB]" />
            </div>
          </button>

          {/* Fee Defaulters by Class */}
          <section className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Fee Defaulters by Class</h2>
                <p className="text-xs text-gray-400 mt-0.5">Students with pending fees</p>
              </div>
              <button
                onClick={() => navigate('/accountant/pending-fees')}
                className="text-xs font-semibold text-[#5B5CEB] flex items-center gap-0.5 hover:underline shrink-0"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {defaultersLoading || isLoading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : !topDefaulters.length ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-gray-600">All clear!</p>
                <p className="text-xs text-gray-400 mt-1">No pending fees at this time</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50/80">
                {topDefaulters.map((d, idx) => (
                  <div key={d.feeRecordId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors group">
                    {/* Avatar */}
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br',
                      AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                    )}>
                      <span className="text-[11px] font-bold text-white">{avatarInitials(d.studentName)}</span>
                    </div>
                    {/* Name + class */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{d.studentName}</p>
                      <p className="text-[11px] text-gray-400">Class {d.class}{d.section}</p>
                    </div>
                    {/* Amount */}
                    <p className="text-sm font-bold text-red-500 shrink-0">{fmt(d.balance)}</p>
                    {/* Status badge */}
                    <div className="shrink-0 hidden sm:block"><StatusBadge d={d} /></div>
                    {/* Date */}
                    <p className="hidden lg:block text-xs text-gray-400 shrink-0 w-20 text-right">
                      {new Date(d.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const g = groupFor(d.class, d.section);
                          if (g) setSendingGroup(g);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#5B5CEB] hover:bg-[#5B5CEB]/10 transition-colors"
                        aria-label="Send reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate('/accountant/pending-fees')}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {sendingGroup && (
        <SendDefaultersModal group={sendingGroup} onClose={() => setSendingGroup(null)} />
      )}
    </div>
  );
}
