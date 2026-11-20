import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentHeader } from '../components/ParentHeader';
import { ChildStatus } from '../components/ChildStatus';
import { TodayAtSchool } from '../components/TodayAtSchool';
import { LearningSnapshot } from '../components/LearningSnapshot';
import { AttentionRequired } from '../components/AttentionRequired';
import { AIInsightCard } from '../components/AIInsightCard';
import { SchoolUpdates } from '../components/SchoolUpdates';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { AIParentAssistant } from '../components/AIParentAssistant';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import type { AttentionItem } from '../types';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function ParentDashboardPage() {
  const { user } = useAuth();
  const { data, activeChild, isLoading, isError, setActiveChildId } = useParentWorkspace();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // The companion buddy (RoleCompanion) opens the assistant by navigating
  // here with { openAssistant: true }; consume the flag so a refresh/back
  // doesn't reopen it.
  useEffect(() => {
    if ((location.state as { openAssistant?: boolean } | null)?.openAssistant) {
      setAiOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const handleAttentionAction = (item: AttentionItem) => {
    // Wired for real navigation/actions once the backing endpoints exist
    // (fee receipt download, PTM RSVP, etc). For now, surface intent via AI.
    if (item.kind === 'fee' || item.kind === 'document') {
      window.print();
    } else {
      setAiOpen(true);
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] flex items-center justify-center px-4 font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
        <p className="text-base text-[#55607A] text-center max-w-sm">
          Something went wrong loading your dashboard. Please try again shortly.
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#FBF8F3]">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] flex flex-col items-center justify-center px-6 text-center font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
        <div className="w-14 h-14 rounded-full bg-[#EEF1F8] flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-[#254A9A]" strokeWidth={1.75} />
        </div>
        <h1 className="text-lg font-bold text-[#1B2A4E]">No children linked yet</h1>
        <p className="text-sm text-[#55607A] mt-1.5 max-w-xs">
          Ask the school office to link your child's profile to this account.
        </p>
      </div>
    );
  }

  const unreadCount = data.notifications.filter((n) => !n.read).length;

  return (
    <>
      <ParentHeader
        parentName={user ? `${user.firstName} ${user.lastName}`.trim() : data.parent.name}
        childName={activeChild.name}
        unreadCount={unreadCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      <motion.main
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
      >
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <ChildStatus
            children={data.children}
            activeChild={activeChild}
            onSelect={setActiveChildId}
          />
        </motion.div>

        {/* Prominent Fee & Pay Dues Card */}
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <section
            aria-label="Fee status"
            className={`rounded-2xl border p-5 sm:p-6 shadow-sm transition-colors ${
              activeChild.feeStatus !== 'paid'
                ? 'bg-gradient-to-br from-[#1B2A4E] to-[#254A9A] border-[#1B2A4E] text-white'
                : 'bg-white border-[#E8E2D6] text-[#1B2A4E]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    activeChild.feeStatus !== 'paid'
                      ? 'bg-white/15 text-amber-300'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {activeChild.feeStatus !== 'paid' ? (
                    <CreditCard className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        activeChild.feeStatus !== 'paid' ? 'text-white/75' : 'text-[#55607A]'
                      }`}
                    >
                      School Fees
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        activeChild.feeStatus === 'overdue'
                          ? 'bg-red-500/25 text-red-100'
                          : activeChild.feeStatus === 'due'
                            ? 'bg-amber-400/25 text-amber-100'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {activeChild.feeStatus === 'overdue'
                        ? 'Overdue'
                        : activeChild.feeStatus === 'due'
                          ? 'Payment Due'
                          : 'Paid'}
                    </span>
                  </div>
                  <div className="mt-1 text-2xl sm:text-[28px] font-bold tracking-tight">
                    {activeChild.feeStatus !== 'paid'
                      ? `₹${(activeChild.feeDueAmount ?? 0).toLocaleString('en-IN')}`
                      : 'All dues cleared'}
                  </div>
                  <p
                    className={`text-xs sm:text-sm mt-0.5 ${
                      activeChild.feeStatus !== 'paid' ? 'text-white/75' : 'text-[#55607A]'
                    }`}
                  >
                    {activeChild.feeStatus !== 'paid'
                      ? `Pending tuition & term fees for ${activeChild.name}`
                      : 'View receipts, upcoming installments & fee breakdown'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/parent/fees')}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer shrink-0 ${
                  activeChild.feeStatus !== 'paid'
                    ? 'bg-amber-400 hover:bg-amber-300 text-[#1B2A4E] shadow-md'
                    : 'bg-[#EEF1F8] hover:bg-[#E2E8F5] text-[#1B2A4E]'
                }`}
              >
                <span>{activeChild.feeStatus !== 'paid' ? 'Pay Dues' : 'View Fee Details'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <TodayAtSchool schedule={data.schedule} />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 items-stretch">
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <LearningSnapshot subjects={data.subjects} />
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <AttentionRequired items={data.attention} onAction={handleAttentionAction} />
          </motion.div>
        </div>

        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <AIInsightCard insight={data.insight} childName={activeChild.name} onAsk={() => setAiOpen(true)} />
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <SchoolUpdates updates={data.updates} />
        </motion.div>
      </motion.main>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={data.notifications}
      />

      <AIParentAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        childId={activeChild._id}
        childName={activeChild.name}
      />
    </>
  );
}
