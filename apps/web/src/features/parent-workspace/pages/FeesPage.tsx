import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
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
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  partially_paid: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
  waived: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<FeeStatus, string> = {
  paid: 'Paid',
  pending: 'Due',
  partially_paid: 'Partially paid',
  overdue: 'Overdue',
  waived: 'Waived',
};

const HEAD_LABEL: Record<FeeRecordView['feeHead'], string> = {
  tuition: 'Tuition',
  admission: 'Admission',
  examination: 'Examination',
  transport: 'Transport',
  hostel: 'Hostel',
  miscellaneous: 'Other',
};

function money(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function FeeRow({ fee }: { fee: FeeRecordView }) {
  const label = fee.feeHead === 'miscellaneous' && fee.customHead ? fee.customHead : HEAD_LABEL[fee.feeHead];
  return (
    <div className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-base text-gray-900 truncate">{fee.description || label}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {label} · Due {new Date(fee.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-semibold text-gray-900 tabular-nums">{money(fee.balance > 0 ? fee.balance : fee.totalAmount)}</p>
        <span className={`inline-block mt-1 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[fee.status]}`}>
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
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-busy="true">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild || isError || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
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

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <ParentScreenHeader
        title="Fees"
        subtitle={`${data.child.name}'s fee summary and payment status`}
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
        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          aria-label="Fee totals"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6 grid grid-cols-3 gap-4 sm:gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Total charged</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1 tabular-nums">{money(data.totalCharged)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Paid</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-1 tabular-nums">{money(data.totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Outstanding</p>
            <p className={`text-lg sm:text-xl font-bold mt-1 tabular-nums ${data.totalOutstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {money(data.totalOutstanding)}
            </p>
          </div>
        </motion.section>

        {data.totalOutstanding > 0 && (
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4"
          >
            <p className="text-base text-purple-900">
              You have {money(data.totalOutstanding)} in outstanding dues. Payments are collected by the school office —
              please visit or call the office to pay.
            </p>
          </motion.div>
        )}

        {outstanding.length > 0 && (
          <motion.section
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            aria-label="Outstanding fees"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
          >
            <p className="text-lg font-bold text-gray-900 mb-1">Due now</p>
            <div className="divide-y divide-gray-100">
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
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
          >
            <p className="text-lg font-bold text-gray-900 mb-1">Payment history</p>
            <div className="divide-y divide-gray-100">
              {settled.map((f) => (
                <FeeRow key={f._id} fee={f} />
              ))}
            </div>
          </motion.section>
        ) : outstanding.length === 0 ? (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <EmptyState icon={Wallet} title="No fee records yet" description="Fee charges will appear here once the school office issues them." />
          </motion.div>
        ) : null}
      </motion.main>
    </div>
  );
}

export default FeesPage;
