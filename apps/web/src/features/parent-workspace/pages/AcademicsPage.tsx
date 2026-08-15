import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, FileText, ChevronRight } from 'lucide-react';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';
import { SubjectProgress } from '../components/SubjectProgress';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ExamResult } from '../types';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const RESULT_BADGE: Record<ExamResult['subjects'][number]['result'], string> = {
  pass: 'bg-emerald-50 text-emerald-700',
  fail: 'bg-red-50 text-red-700',
  na: 'bg-gray-100 text-gray-500',
};

function ExamCard({ exam }: { exam: ExamResult }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-gray-900">{exam.examName}</p>
          {exam.termLabel && <p className="text-sm text-gray-500 mt-0.5">{exam.termLabel}</p>}
        </div>
        {typeof exam.overallPercentage === 'number' && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-purple-700 tabular-nums">{exam.overallPercentage}%</p>
            <p className="text-sm text-gray-400">Overall</p>
          </div>
        )}
      </div>

      <div className="mt-5 divide-y divide-gray-100">
        {exam.subjects.map((s) => (
          <div key={s.subject} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="text-base text-gray-900">{s.subject}</span>
            <div className="flex items-center gap-3 shrink-0">
              {typeof s.percentage === 'number' && (
                <span className="text-base font-semibold text-gray-900 tabular-nums">{s.percentage}%</span>
              )}
              {s.grade && <span className="text-sm text-gray-500">Grade {s.grade}</span>}
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RESULT_BADGE[s.result]}`}>
                {s.result === 'pass' ? 'Pass' : s.result === 'fail' ? 'Needs support' : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AcademicsPage() {
  const navigate = useNavigate();
  const { data: workspace, activeChild, isLoading: workspaceLoading, setActiveChildId } = useParentWorkspace();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['parent-academics', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getAcademics(activeChild!._id),
    enabled: !!activeChild,
  });

  // Lightweight check only — the full document (template, QR, school
  // branding) is fetched on ReportCardPage once the parent actually opens it.
  const { data: reportCard } = useQuery({
    queryKey: ['parent-report-card', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getReportCard(activeChild!._id),
    enabled: !!activeChild,
  });

  if (workspaceLoading || (isLoading && !data)) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-busy="true">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild || isError || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <EmptyState
          icon={GraduationCap}
          title={!activeChild ? 'No children linked yet' : 'Could not load academics'}
          description={!activeChild ? "Ask the school office to link your child's profile to this account." : 'Please try again shortly.'}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <ParentScreenHeader
        title="Academics"
        subtitle={`${data.child.name}'s exam results and subject progress`}
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
        {reportCard?.available && (
          <motion.button
            type="button"
            onClick={() => navigate('/parent/academics/report-card')}
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            className="w-full flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-purple-700" strokeWidth={1.75} />
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-semibold text-gray-900">Term Report Card</span>
              <span className="block text-sm text-gray-500 mt-0.5">View the full published report card, printable as PDF</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" strokeWidth={2} />
          </motion.button>
        )}

        {data.subjectTrend.length > 0 && (
          <motion.section
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            aria-label="Subject progress"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
          >
            <p className="text-lg font-bold text-gray-900 mb-4">Subject-wise progress</p>
            <div className="space-y-5">
              {data.subjectTrend.map((s) => (
                <SubjectProgress key={s._id} {...s} />
              ))}
            </div>
          </motion.section>
        )}

        {data.exams.length === 0 ? (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <EmptyState
              icon={BookOpen}
              title="No published results yet"
              description="Exam results will appear here as soon as the school publishes them."
            />
          </motion.div>
        ) : (
          data.exams.map((exam) => (
            <motion.div key={exam.examId} variants={fadeUp} transition={{ duration: 0.25 }}>
              <ExamCard exam={exam} />
            </motion.div>
          ))
        )}
      </motion.main>
    </div>
  );
}

export default AcademicsPage;
