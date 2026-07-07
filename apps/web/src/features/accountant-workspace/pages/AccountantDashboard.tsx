import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ChevronRight, Loader2
} from 'lucide-react';
import { useAccountantDashboard, useGroupedDefaulters } from '../hooks/useAccountantWorkspace';
import { SendDefaultersModal } from '../components/SendDefaultersModal';
import { UpcomingEventsWidget } from '@/features/events/components/UpcomingEventsWidget';
import type { ClassDefaulterGroup } from '@schoolos/types';
import { motion } from 'framer-motion';

// ── Utilities ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, trendLabel, onClick, isLoading, delay,
}: {
  label: string;
  value: string;
  trendLabel: string;
  onClick: () => void;
  isLoading?: boolean;
  delay: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 text-left hover:border-[#10B981]/25 hover:shadow-[0_8px_30px_rgba(16,185,129,0.03)] transition-all duration-300 flex flex-col justify-between h-[180px] w-full"
    >
      <div className="space-y-4">
        {/* Label - 12px */}
        <p className="text-[12px] font-semibold text-gray-400 tracking-wide uppercase">{label}</p>
        
        {/* Value - Large numbers 48px */}
        {isLoading ? (
          <div className="h-10 bg-gray-100 rounded-md animate-pulse mt-2 w-32" />
        ) : (
          <p
            title={value}
            className="text-[34px] font-semibold text-gray-900 tracking-tight leading-none truncate"
          >
            {value}
          </p>
        )}
      </div>
      
      {/* TrendLabel - 12px */}
      <p className="text-[12px] font-semibold text-gray-400">
        {trendLabel}
      </p>
    </motion.button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#E8E8E8] animate-pulse">
      <div className="space-y-1.5 flex-1">
        <div className="h-3.5 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="w-16 h-3.5 bg-gray-100 rounded" />
    </div>
  );
}

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

  const [wantsGroups, setWantsGroups] = useState(false);
  const [pendingSend, setPendingSend] = useState<{ class: string; section: string } | null>(null);
  const { data: groupedDefaulters, isFetching: groupsFetching } = useGroupedDefaulters(wantsGroups);
  const [sendingGroup, setSendingGroup] = useState<ClassDefaulterGroup | null>(null);

  const topDefaulters = useMemo(
    () => [...(data?.defaulters ?? [])].sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 5),
    [data?.defaulters],
  );

  const groupFor = (classLabel: string, section: string) =>
    groupedDefaulters?.find((g) => g.class === classLabel && g.section === section) ?? null;

  function requestSend(classLabel: string, section: string) {
    if (!wantsGroups) {
      setWantsGroups(true);
      setPendingSend({ class: classLabel, section });
      return;
    }
    const g = groupFor(classLabel, section);
    if (g) setSendingGroup(g);
  }

  useEffect(() => {
    if (!pendingSend || !groupedDefaulters) return;
    const g = groupFor(pendingSend.class, pendingSend.section);
    if (g) setSendingGroup(g);
    setPendingSend(null);
  }, [groupedDefaulters, pendingSend]);

  const kpiCards = buildKpiCards(data, isLoading);

  return (
    <div className="min-h-screen bg-white">
      <div className="p-8 space-y-6 max-w-7xl mx-auto">

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        {isError ? (
          <div className="bg-red-50 border border-red-200 rounded-[18px] p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load dashboard. Please refresh.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiCards.map((card, idx) => (
              <KpiCard
                key={card.key}
                label={card.label}
                value={card.value}
                trendLabel={card.trendLabel}
                onClick={() => navigate(card.path)}
                isLoading={isLoading}
                delay={idx * 0.05}
              />
            ))}
          </div>
        )}

        {/* ── Main content grid (Exactly 1.6x the KPI height: 288px) ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Collect Fees Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[288px] flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Collect Fees</h2>
                <p className="text-[12px] text-gray-400 font-medium mt-1">Search a student and collect fees instantly</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/accountant/collect-fee')}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-[#E8E8E8] text-[13px] font-medium text-gray-600 hover:bg-[#10B981]/5 hover:border-[#10B981]/25 hover:text-[#0B3D2E] transition-all duration-200 self-start"
            >
              Go to Collect Fees
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </motion.div>

          {/* Fee Defaulters by Class Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[288px] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8]">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Fee Defaulters by Class</h2>
                <p className="text-[12px] text-gray-400 font-medium mt-0.5">Students with pending fees</p>
              </div>
              <button
                onClick={() => navigate('/accountant/pending-fees')}
                className="inline-flex items-center gap-1 h-7.5 px-3 rounded-xl bg-white border border-[#E8E8E8] text-[11px] font-medium text-gray-600 hover:bg-[#10B981]/5 hover:border-[#10B981]/25 hover:text-[#0B3D2E] transition-all duration-200"
              >
                View all
                <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="space-y-0.5">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : !topDefaulters.length ? (
                <div className="h-full flex flex-col items-center justify-center py-6">
                  <p className="text-[15px] font-semibold text-gray-800">All clear!</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">No pending fees at this time</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E8E8]/60">
                  {topDefaulters.map((d) => (
                    <div key={d.feeRecordId} className="flex items-center justify-between py-3.5 transition-colors group">
                      {/* Name + class (Pure typography, no avatars or icons) */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-800 truncate">{d.studentName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Class {d.class}{d.section}</p>
                      </div>
                      
                      {/* Balance amount & Overdue Button */}
                      <div className="flex items-center gap-4 ml-4 shrink-0">
                        <p className="text-[13px] font-semibold text-red-600">{fmt(d.balance)}</p>
                        <button
                          onClick={() => requestSend(d.class, d.section)}
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#E8E8E8] text-[11px] font-semibold text-gray-500 hover:bg-[#10B981]/5 hover:border-[#10B981]/25 hover:text-[#0B3D2E] transition-all duration-200"
                        >
                          {groupsFetching && pendingSend?.class === d.class && pendingSend?.section === d.section ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Remind'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        </div>

        <UpcomingEventsWidget />

      </div>

      {sendingGroup && (
        <SendDefaultersModal group={sendingGroup} onClose={() => setSendingGroup(null)} />
      )}
    </div>
  );
}
