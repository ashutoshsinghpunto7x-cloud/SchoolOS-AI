import { useEffect, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  CalendarCheck,
  Award,
  Wallet,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentHeader } from '../components/ParentHeader';
import { ChildStatus } from '../components/ChildStatus';
import { TodayAtSchool } from '../components/TodayAtSchool';
import { LearningSnapshot } from '../components/LearningSnapshot';
import { AttentionRequired } from '../components/AttentionRequired';
import { StudentPersonalityCard } from '../components/StudentPersonalityCard';
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

  // Fetch report card bundle quietly so StudentPersonalityCard & Report Card pill reflect published term data
  const { data: reportCardBundle } = useQuery({
    queryKey: ['parent-report-card', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getReportCard(activeChild!._id),
    enabled: !!activeChild,
  });

  useEffect(() => {
    if ((location.state as { openAssistant?: boolean } | null)?.openAssistant) {
      setAiOpen((prev) => !prev);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const handleAttentionAction = (item: AttentionItem) => {
    if (item.kind === 'fee') {
      navigate('/parent/fees');
    } else if (item.kind === 'document') {
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
          Ask the school office to link your child&apos;s profile to this account.
        </p>
      </div>
    );
  }

  const unreadCount = data.notifications.filter((n) => !n.read).length;
  const attPct = Math.round(activeChild.attendancePercent || 0);
  const avgPct = Math.round((activeChild.academicAverage || 0) * 10);
  const strongestSubject =
    data.subjects.length > 0 ? [...data.subjects].sort((a, b) => b.percent - a.percent)[0] : undefined;

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
                : 'bg-gradient-to-r from-emerald-50 via-white to-teal-50/70 border-emerald-200 text-[#1B2A4E]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    activeChild.feeStatus !== 'paid'
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'bg-emerald-600 text-white'
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
                        activeChild.feeStatus !== 'paid' ? 'text-white/75' : 'text-emerald-800'
                      }`}
                    >
                      School Fees
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        activeChild.feeStatus === 'overdue'
                          ? 'bg-rose-500/30 text-rose-100'
                          : activeChild.feeStatus === 'due'
                            ? 'bg-amber-400/25 text-amber-100'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {activeChild.feeStatus === 'overdue'
                        ? 'Overdue'
                        : activeChild.feeStatus === 'due'
                          ? 'Payment Due'
                          : 'Paid'}
                    </span>
                  </div>
                  <div className="mt-1 text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums">
                    {activeChild.feeStatus !== 'paid'
                      ? `₹${(activeChild.feeDueAmount ?? 0).toLocaleString('en-IN')}`
                      : 'All dues cleared'}
                  </div>
                  <p
                    className={`text-xs sm:text-sm mt-0.5 m-0 ${
                      activeChild.feeStatus !== 'paid' ? 'text-white/75' : 'text-[#55607A]'
                    }`}
                  >
                    {activeChild.feeStatus !== 'paid'
                      ? `Pending tuition & term fees for ${activeChild.name}`
                      : 'View payment history, receipts & installment breakdown'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/parent/fees')}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer shrink-0 ${
                  activeChild.feeStatus !== 'paid'
                    ? 'bg-amber-400 hover:bg-amber-300 text-[#1B2A4E] shadow-md'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                <span>{activeChild.feeStatus !== 'paid' ? 'Pay Dues' : 'Fee History'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </motion.div>

        {/* ── Main 3 Colour-Coded Pillars: Attendance Report · Mark Report · Fee History ── */}
        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          aria-label="Core student reports"
          className="grid md:grid-cols-3 gap-4"
        >
          {/* 1. Attendance Report (Emerald) */}
          <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Attendance Report
                </span>
                <div className="pw-ring-wrap">
                  <progress
                    value={attPct}
                    max={100}
                    aria-label="Term attendance percentage"
                    aria-valuetext={`${attPct}%`}
                    className="pw-ring"
                    style={
                      {
                        '--size': '46px',
                        '--thickness': '5px',
                        '--pw-ring-val': attPct,
                        '--fill-color': '#059669',
                        '--track-color': '#D1FAE5',
                      } as CSSProperties
                    }
                  />
                  <span className="pw-ring-label text-[11px] font-bold text-emerald-900" aria-hidden="true">
                    {attPct}%
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-950 tabular-nums m-0 mt-3">{attPct}% Present</p>
              <p className="text-xs text-emerald-800/90 m-0 mt-1">
                {activeChild.status === 'present'
                  ? `Checked in today${activeChild.checkedInAt ? ` at ${activeChild.checkedInAt}` : ''}`
                  : activeChild.status === 'holiday'
                    ? 'On approved leave / holiday today'
                    : 'View monthly calendar & daily logs'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/parent/attendance')}
              className="mt-4 w-full inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Open Attendance Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Mark Report & Report Card (Indigo / Royal Blue) */}
          <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/60 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  Mark Report
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800">
                  {reportCardBundle?.available ? 'Card Published' : 'Live Scores'}
                </span>
              </div>
              <p className="text-2xl font-bold text-indigo-950 tabular-nums m-0 mt-3">
                {avgPct > 0 ? `${avgPct}% Average` : 'Marks & Grades'}
              </p>
              <p className="text-xs text-indigo-900/80 m-0 mt-1 truncate">
                {strongestSubject
                  ? `Top subject: ${strongestSubject.subject} (${strongestSubject.percent}%)`
                  : 'Subject-wise exam scores & term report card'}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/parent/academics/report-card')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Report Card</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/parent/academics')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Marks →
              </button>
            </div>
          </div>

          {/* 3. Fee History & Ledger (Warm Amber) */}
          <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
                  Fee History
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    activeChild.feeStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-200/80 text-amber-950'
                  }`}
                >
                  {activeChild.feeStatus === 'paid' ? 'Cleared' : 'Action Needed'}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-950 tabular-nums m-0 mt-3">
                {activeChild.feeStatus !== 'paid'
                  ? `₹${(activeChild.feeDueAmount ?? 0).toLocaleString('en-IN')} Due`
                  : '100% Settled'}
              </p>
              <p className="text-xs text-amber-900/80 m-0 mt-1">
                Past payment receipts, fee heads &amp; upcoming due dates
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/parent/fees')}
              className="mt-4 w-full inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>View Fee History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.section>

        {/* Student Personality Card */}
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <StudentPersonalityCard
            child={activeChild}
            subjects={data.subjects}
            reportCard={reportCardBundle?.reportCard}
            template={reportCardBundle?.template}
            onOpenReportCard={() => navigate('/parent/academics/report-card')}
          />
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
          <TodayAtSchool schedule={data.schedule} />
        </motion.div>

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
