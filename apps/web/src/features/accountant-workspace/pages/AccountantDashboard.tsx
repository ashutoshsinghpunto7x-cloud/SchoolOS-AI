import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ChevronRight, Loader2, UserRound
} from 'lucide-react';
import { useAccountantDashboard, useGroupedDefaulters } from '../hooks/useAccountantWorkspace';
import { SendDefaultersModal } from '../components/SendDefaultersModal';
import { UpcomingEventsWidget } from '@/features/events/components/UpcomingEventsWidget';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ClassDefaulterGroup } from '@schoolos/types';
import { motion } from 'framer-motion';
import { ACCOUNTANT_HERO_GRADIENT_STYLE } from '../gradient';

// ── Utilities ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const FEE_HEAD_LABELS: Record<string, string> = {
  tuition: 'Tuition', admission: 'Admission', examination: 'Examination',
  transport: 'Transport', hostel: 'Hostel', miscellaneous: 'Misc.',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayDateStr() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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
      className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 text-left hover:border-[#A855F7]/25 hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)] transition-all duration-300 flex flex-col justify-between h-[180px] w-full"
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
// This array drives the 4 KPI cards rendered near the top of the page (the
// `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4` block further down). Each
// object here becomes one <KpiCard>. All the actual numbers come from a single
// network call — `useAccountantDashboard()` — which hits GET
// /accountant-workspace/dashboard on the server (see
// apps/server/src/features/accountant-workspace/accountant-workspace.service.ts
// → getDashboard()). Add/remove/reorder a KPI tile by editing this array —
// nothing else needs to change.
function buildKpiCards(data: ReturnType<typeof useAccountantDashboard>['data'], isLoading: boolean) {
  return [
    {
      // Card 1: "Fees Collected Today" — sum of every payment recorded with
      // today's date (server: feePaymentRepository.getTotalCollectedBetween).
      // Clicking it opens the Reports page.
      key: 'fees-collected',
      label: 'Fees Collected Today',
      value: isLoading ? '—' : fmt(data?.feesCollectedToday ?? 0),
      trendLabel: (data?.feesCollectedToday ?? 0) > 0 ? 'Updated today' : 'No change',
      path: '/accountant/reports',
    },
    {
      // Card 2: "Pending Fees" — total charged minus total collected across
      // fee records whose due date has already arrived (server:
      // feeRepository.getSummary(schoolId, { dueOnOrBefore: today }) called
      // from accountant-workspace.service.ts). A fee due next month does NOT
      // count here yet — see the dueOnOrBefore comment on that call for why.
      // The sub-label counts fees whose status has flipped to "overdue"
      // (past due date, still unpaid) — a subset of the total above.
      // Clicking it opens the Pending Fees page.
      key: 'pending-fees',
      label: 'Pending Fees',
      value: isLoading ? '—' : fmt(data?.feeSummary.totalOutstanding ?? 0),
      trendLabel: data && data.feeSummary.overdueCount > 0 ? `${data.feeSummary.overdueCount} overdue` : 'No change',
      path: '/accountant/pending-fees',
    },
    {
      // Card 3: "Pending Salary" — sum of salary records not yet marked paid
      // (server: salaryRepository.getSummary). Clicking it opens Salary.
      key: 'pending-salary',
      label: 'Pending Salary',
      value: isLoading ? '—' : fmt(data?.salarySummary.totalPending ?? 0),
      trendLabel: data && data.salarySummary.pendingCount > 0 ? `${data.salarySummary.pendingCount} employees` : 'No change',
      path: '/accountant/salary',
    },
    {
      // Card 4: "Pending Expenses" — sum of expense claims awaiting approval
      // (server: expenseRepository.getSummary). Clicking it opens Expenses.
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
  // Single source of truth for every number on this page — one GET request,
  // fanned out into the KPI cards, the defaulters list, etc. See
  // useAccountantDashboard() in ../hooks/useAccountantWorkspace.ts.
  const { data, isLoading, isError, refetch } = useAccountantDashboard();

  // ── "Remind" button state machine (Fee Defaulters by Class card) ──────────
  // The defaulters list itself (`data.defaulters`, used below for
  // `topDefaulters`) is per-student and cheap — it's always fetched as part
  // of the main dashboard call. But sending a reminder needs the *grouped*
  // view (all defaulters bucketed by class+section, with contact info),
  // which is a separate, heavier query (`useGroupedDefaulters`) that we don't
  // want to fire on every dashboard load — only once the accountant actually
  // clicks "Remind" on some row. `wantsGroups` is the flag that turns that
  // query on; `pendingSend` remembers *which* class/section the accountant
  // clicked while the grouped query is still in flight, so the reminder
  // modal (`sendingGroup`) can open automatically the moment the data lands
  // (see the effect below) instead of requiring a second click.
  const [wantsGroups, setWantsGroups] = useState(false);
  const [pendingSend, setPendingSend] = useState<{ class: string; section: string } | null>(null);
  const { data: groupedDefaulters, isFetching: groupsFetching } = useGroupedDefaulters(wantsGroups);
  const [sendingGroup, setSendingGroup] = useState<ClassDefaulterGroup | null>(null);

  // Top 5 individual defaulters (any class), most-overdue first — feeds the
  // "Fee Defaulters by Class" card's row list further down.
  const topDefaulters = useMemo(
    () => [...(data?.defaulters ?? [])].sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 5),
    [data?.defaulters],
  );

  const groupFor = (classLabel: string, section: string) =>
    groupedDefaulters?.find((g) => g.class === classLabel && g.section === section) ?? null;

  // Called by each row's "Remind" button. First click ever on this page:
  // kicks off the grouped-defaulters fetch and remembers what to open once it
  // resolves (handled by the effect below). Every click after that: the
  // grouped data is already cached, so it opens the modal immediately.
  function requestSend(classLabel: string, section: string) {
    if (!wantsGroups) {
      setWantsGroups(true);
      setPendingSend({ class: classLabel, section });
      return;
    }
    const g = groupFor(classLabel, section);
    if (g) setSendingGroup(g);
  }

  // Fires once `groupedDefaulters` finishes loading after the *first*
  // "Remind" click — opens the SendDefaultersModal for whichever class/
  // section the accountant originally clicked.
  useEffect(() => {
    if (!pendingSend || !groupedDefaulters) return;
    const g = groupFor(pendingSend.class, pendingSend.section);
    if (g) setSendingGroup(g);
    setPendingSend(null);
  }, [groupedDefaulters, pendingSend]);

  // The 4 top KPI tiles — see buildKpiCards() above for what each one means.
  const kpiCards = buildKpiCards(data, isLoading);
  const { user } = useAuth();
  const firstName = user?.firstName ?? 'Accountant';

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero header — same gradient treatment as the Teacher & Principal dashboards.
          Sits directly beneath Topbar's now-matching purple bar (see Topbar.tsx's
          isAccountantDashboard branch) so the two read as one continuous block —
          hence the trimmed top padding instead of the usual pt-8. ── */}
      <div
        className="px-5 lg:px-8 pt-3 pb-8 relative overflow-hidden"
        style={ACCOUNTANT_HERO_GRADIENT_STYLE}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />

        <div className="relative max-w-7xl mx-auto">
          <p className="text-white/70 text-sm font-medium">{greeting()},</p>
          <h1 className="text-3xl font-bold text-white mt-0.5 tracking-tight">{firstName}</h1>
          <p className="text-white/60 text-sm mt-0.5">{todayDateStr()}</p>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-7xl mx-auto">

        {/* ── KPI Cards ───────────────────────────────────────────────────────
            4 tiles, one per entry in buildKpiCards() above: Fees Collected
            Today, Pending Fees, Pending Salary, Pending Expenses. Each is
            just a number + a click target to the relevant page — no
            calculation happens here, it's all pulled pre-computed from
            `data` (see useAccountantDashboard() and the server's
            accountant-workspace.service.ts → getDashboard()). ──────────── */}
        {isError ? (
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

        {/* ── Main content grid (Exactly 1.6x the KPI height: 288px) ─────────
            Two side-by-side cards on desktop: "Collect Fees" (a pure nav
            shortcut, no data of its own) on the left, "Fee Defaulters by
            Class" (the actual per-student pending-fee list) on the right. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Collect Fees Card — no data fetching here at all, it's just a
              shortcut button to /accountant/collect-fee (the student search +
              payment-collection flow lives entirely on that page). */}
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
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-[#E8E8E8] text-[13px] font-medium text-gray-600 hover:bg-[#A855F7]/5 hover:border-[#A855F7]/25 hover:text-[#5B21B6] transition-all duration-200 self-start"
            >
              Go to Collect Fees
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </motion.div>

          {/* Fee Defaulters by Class Card — lists the 5 most-overdue students
              (`topDefaulters`, computed above from `data.defaulters`). The
              "Remind" button per row triggers the grouped-defaulters fetch +
              SendDefaultersModal flow explained above `requestSend()`. */}
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
                className="inline-flex items-center gap-1 h-7.5 px-3 rounded-xl bg-white border border-[#E8E8E8] text-[11px] font-medium text-gray-600 hover:bg-[#A855F7]/5 hover:border-[#A855F7]/25 hover:text-[#5B21B6] transition-all duration-200"
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
                      {/* Name + class + which fee this balance is for (Pure typography, no avatars or icons) */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-800 truncate">{d.studentName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Class {d.class}{d.section} · {d.feeHead === 'miscellaneous' && d.description ? d.description : (FEE_HEAD_LABELS[d.feeHead] ?? d.feeHead)}
                        </p>
                      </div>
                      
                      {/* Balance amount & Overdue Button */}
                      <div className="flex items-center gap-4 ml-4 shrink-0">
                        <p className="text-[13px] font-semibold text-red-600">{fmt(d.balance)}</p>
                        <button
                          onClick={() => requestSend(d.class, d.section)}
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#E8E8E8] text-[11px] font-semibold text-gray-500 hover:bg-[#A855F7]/5 hover:border-[#A855F7]/25 hover:text-[#5B21B6] transition-all duration-200"
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

        {/* Teachers quick-link — same idea as "Collect Fees" above: a plain
            nav shortcut to /accountant/teachers, no data of its own here. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center shrink-0">
              <UserRound className="w-5 h-5 text-[#5B21B6]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Teachers</h2>
              <p className="text-[12px] text-gray-400 font-medium mt-0.5">Search a teacher and manage their profile photo</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/accountant/teachers')}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-[#E8E8E8] text-[13px] font-medium text-gray-600 hover:bg-[#A855F7]/5 hover:border-[#A855F7]/25 hover:text-[#5B21B6] transition-all duration-200 shrink-0"
          >
            Go to Teachers
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </motion.div>

        {/* School-wide calendar events (holidays, exams, etc.) — shared
            component also used on the Principal/Reception dashboards; fetches
            its own data independently of `useAccountantDashboard()` above. */}
        <UpcomingEventsWidget />

      </div>

      {/* "Remind this class/section" modal — only rendered once a Remind
          button's requestSend() flow (see above) has resolved a group to send to. */}
      {sendingGroup && (
        <SendDefaultersModal group={sendingGroup} onClose={() => setSendingGroup(null)} />
      )}
    </div>
  );
}
