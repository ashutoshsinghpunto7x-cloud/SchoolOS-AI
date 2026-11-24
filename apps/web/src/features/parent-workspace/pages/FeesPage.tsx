import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  Bus,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Home,
  Receipt,
  Wallet,
} from 'lucide-react';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { FeeRecordView, FeeStatus } from '../types';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const STATUS_BADGE: Record<FeeStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-900 border border-amber-200',
  partially_paid: 'bg-amber-50 text-amber-900 border border-amber-200',
  overdue: 'bg-rose-50 text-rose-800 border border-rose-200',
  waived: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const STATUS_LABEL: Record<FeeStatus, string> = {
  paid: 'Paid',
  pending: 'Due',
  partially_paid: 'Partially paid',
  overdue: 'Overdue',
  waived: 'Waived',
};

const HEAD_LABEL: Record<FeeRecordView['feeHead'], string> = {
  tuition: 'Tuition Fee',
  admission: 'Admission Fee',
  examination: 'Exam Fee',
  transport: 'Transport Fee',
  hostel: 'Hostel Fee',
  miscellaneous: 'Activity / Other',
};

const HEAD_STYLE: Record<FeeRecordView['feeHead'], { icon: typeof Wallet; cls: string }> = {
  tuition: { icon: GraduationCap, cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  admission: { icon: BookOpen, cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  examination: { icon: Receipt, cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  transport: { icon: Bus, cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  hostel: { icon: Home, cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  miscellaneous: { icon: CreditCard, cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function money(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function FeeRow({ fee }: { fee: FeeRecordView }) {
  const label = fee.feeHead === 'miscellaneous' && fee.customHead ? fee.customHead : HEAD_LABEL[fee.feeHead];
  const head = HEAD_STYLE[fee.feeHead];
  const HeadIcon = head.icon;

  return (
    <div className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${head.cls}`}>
          <HeadIcon className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-semibold text-[#1B2A4E] truncate m-0">
            {fee.description || label}
          </p>
          <p className="text-xs sm:text-sm text-[#55607A] m-0 mt-0.5">
            {label} · Due{' '}
            {new Date(fee.dueDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm sm:text-base font-bold text-[#1B2A4E] tabular-nums m-0">
          {money(fee.balance > 0 ? fee.balance : fee.totalAmount)}
        </p>
        <span className={`inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[fee.status]}`}>
          {STATUS_LABEL[fee.status]}
        </span>
      </div>
    </div>
  );
}

export function FeesPage() {
  const { data: workspace, activeChild, isLoading: workspaceLoading, setActiveChildId } = useParentWorkspace();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['parent-fees', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getFees(activeChild!._id),
    enabled: !!activeChild,
  });

  if (workspaceLoading || (isLoading && !data)) {
    return (
      <div className="min-h-screen bg-[#FBF8F3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-hidden="true">
          <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild || isError || !data) {
    return (
      <div className="min-h-screen bg-[#FBF8F3]">
        <EmptyState
          icon={Wallet}
          title={!activeChild ? 'No children linked yet' : 'Could not load fees'}
          description={!activeChild ? "Ask the school office to link your child's profile to this account." : 'Please try again shortly.'}
        />
      </div>
    );
  }

  const outstanding = data.records.filter((f) => f.balance > 0);
  const settled = data.records.filter((f) => f.balance <= 0);
  const paidPercent = data.totalCharged > 0 ? Math.min(100, Math.round((data.totalPaid / data.totalCharged) * 100)) : 100;

  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <ParentScreenHeader
        title="Fee History & Dues"
        subtitle={`${data.child.name}'s fee breakdown, receipts & pending installments`}
        children={workspace?.children}
        activeChild={activeChild}
        onSelectChild={setActiveChildId}
      />

      <motion.main
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
      >
        {/* Colourful 3-Card Summary + Paid Progress Bar */}
        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          aria-label="Fee totals"
          className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-5 sm:p-6 space-y-4"
        >
          <div className="grid sm:grid-cols-3 gap-3.5">
            <div className="rounded-xl bg-[#FBF8F3] border border-[#E8E2D6] p-4">
              <p className="text-xs uppercase tracking-wider text-[#55607A] font-semibold m-0">Total Charged</p>
              <p className="text-xl font-bold text-[#1B2A4E] mt-1 tabular-nums m-0">{money(data.totalCharged)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50/85 border border-emerald-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-emerald-800 font-semibold m-0">Total Paid</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold text-emerald-900 mt-1 tabular-nums m-0">{money(data.totalPaid)}</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                data.totalOutstanding > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider font-semibold opacity-80 m-0">Pending Dues</p>
                {data.totalOutstanding > 0 && <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />}
              </div>
              <p className="text-xl font-bold mt-1 tabular-nums m-0">{money(data.totalOutstanding)}</p>
            </div>
          </div>

          {data.totalCharged > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#55607A] mb-1.5">
                <span>Annual Fee Progress</span>
                <span className="text-emerald-700 tabular-nums">{paidPercent}% Paid</span>
              </div>
              <progress
                value={paidPercent}
                max={100}
                aria-label={`Annual fee paid: ${paidPercent}%`}
                className="pw-progress w-full h-2.5 block"
                style={
                  {
                    '--pw-fill': '#059669',
                    '--pw-track': '#FEF3C7',
                  } as CSSProperties
                }
              />
            </div>
          )}
        </motion.section>

        {data.totalOutstanding > 0 && (
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <p className="text-sm font-bold m-0">
                {money(data.totalOutstanding)} due for {data.child.name.split(' ')[0]}
              </p>
              <p className="text-xs sm:text-sm text-white/90 m-0 mt-0.5">
                Payments are collected at the school accounts desk — visit or contact the office to clear dues and collect your receipt.
              </p>
            </div>
          </motion.div>
        )}

        {outstanding.length > 0 && (
          <motion.section
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            aria-label="Outstanding fees"
            className="bg-white rounded-2xl border border-amber-200 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-lg font-bold text-[#1B2A4E] m-0">Pending Installments</p>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                {outstanding.length} Due
              </span>
            </div>
            <div className="divide-y divide-[#EFEAE0]">
              {outstanding.map((f) => (
                <FeeRow key={f._id} fee={f} />
              ))}
            </div>
          </motion.section>
        )}

        {settled.length > 0 ? (
          <motion.section
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            aria-label="Fee history"
            className="bg-white rounded-2xl border border-emerald-200/80 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-lg font-bold text-[#1B2A4E] m-0">Fee Payment History</p>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {settled.length} Settled
              </span>
            </div>
            <div className="divide-y divide-[#EFEAE0]">
              {settled.map((f) => (
                <FeeRow key={f._id} fee={f} />
              ))}
            </div>
          </motion.section>
        ) : outstanding.length === 0 ? (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <EmptyState
              icon={Wallet}
              title="No fee records yet"
              description="Fee charges and payment history will appear here once issued by the school office."
            />
          </motion.div>
        ) : null}
      </motion.main>
    </div>
  );
}

export default FeesPage;
