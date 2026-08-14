import { useState } from 'react';
import { motion } from 'framer-motion';
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
  const { data, activeChild, isLoading, isError, setActiveChildId } = useParentWorkspace();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

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
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16 text-center">
        <p className="text-base text-[#6B6B6B]">
          Something went wrong loading your dashboard. Please try again shortly.
        </p>
      </div>
    );
  }

  if (isLoading || !data || !activeChild) {
    return (
      <div className="min-h-screen bg-[#F5F1EB]">
        <DashboardSkeleton />
      </div>
    );
  }

  const unreadCount = data.notifications.filter((n) => !n.read).length;

  return (
    <>
      <ParentHeader
        parentName={data.parent.name}
        childName={activeChild.name}
        unreadCount={unreadCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      <motion.main
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="max-w-5xl mx-auto px-5 sm:px-8 py-6 space-y-5"
      >
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <ChildStatus
            children={data.children}
            activeChild={activeChild}
            onSelect={setActiveChildId}
          />
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <TodayAtSchool schedule={data.schedule} />
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
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
