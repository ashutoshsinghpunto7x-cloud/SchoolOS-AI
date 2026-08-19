import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, PlayCircle, Trophy } from 'lucide-react';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useParentMockTests } from '@/features/mock-tests/hooks/useMockTests';
import type { ParentMockTestSummary } from '@schoolos/types';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const STATUS_LABEL: Record<ParentMockTestSummary['status'], string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Upcoming',
  rejected: 'Rejected',
  live: 'Live now',
  closed: 'Closed',
};

const STATUS_STYLE: Record<ParentMockTestSummary['status'], string> = {
  draft: 'bg-gray-100 text-gray-500',
  pending_approval: 'bg-gray-100 text-gray-500',
  approved: 'bg-blue-50 text-blue-700',
  rejected: 'bg-gray-100 text-gray-500',
  live: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
};

function isWithinTakingWindow(test: ParentMockTestSummary): boolean {
  const start = new Date(test.scheduledStart).getTime();
  const takingWindowEnd = Math.min(start + test.durationMinutes * 60_000, new Date(test.scheduledEnd).getTime());
  const now = Date.now();
  return now <= takingWindowEnd;
}

function TestCard({ test, onStart }: { test: ParentMockTestSummary; onStart: () => void }) {
  const canStart = test.status === 'live' && isWithinTakingWindow(test) && !test.alreadyAttempted;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900 truncate">{test.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{test.subject} · {test.questionCount} questions · {test.totalMarks} marks</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[test.status]}`}>
          {STATUS_LABEL[test.status]}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          {test.status === 'live' ? `Started ${new Date(test.scheduledStart).toLocaleString()}` : new Date(test.scheduledStart).toLocaleString()}
          {' · '}{test.durationMinutes} min
        </p>
        {test.mode === 'ranked' && test.alreadyAttempted && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700">
            <Trophy className="w-3.5 h-3.5" /> Submitted
          </span>
        )}
      </div>

      {canStart && (
        <button
          type="button"
          onClick={onStart}
          className="mt-4 w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <PlayCircle className="w-4 h-4" /> Start Test
        </button>
      )}
    </div>
  );
}

export function TestsPage() {
  const navigate = useNavigate();
  const { data: workspace, activeChild, isLoading: workspaceLoading, setActiveChildId } = useParentWorkspace();

  const { data: tests, isLoading } = useParentMockTests(activeChild?._id);

  if (workspaceLoading || (isLoading && !tests)) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-busy="true">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <EmptyState icon={ClipboardList} title="No children linked yet" description="Ask the school office to link your child's profile to this account." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <ParentScreenHeader
        title="Mock Tests"
        subtitle={`Live and upcoming tests for ${activeChild.name}'s class`}
        children={workspace?.children}
        activeChild={activeChild}
        onSelectChild={setActiveChildId}
      />

      <motion.main
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4"
      >
        {!tests?.length ? (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <EmptyState icon={ClipboardList} title="No mock tests yet" description="Mock tests scheduled for your child's class will appear here." />
          </motion.div>
        ) : (
          tests.map((t) => (
            <motion.div key={t._id} variants={fadeUp} transition={{ duration: 0.25 }}>
              <TestCard test={t} onStart={() => navigate(`/parent/tests/${t._id}/take`)} />
            </motion.div>
          ))
        )}
      </motion.main>
    </div>
  );
}

export default TestsPage;
