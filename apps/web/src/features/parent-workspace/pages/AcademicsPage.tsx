import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, FileText, ChevronRight, Award, Sparkles } from 'lucide-react';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';
import { SubjectProgress } from '../components/SubjectProgress';
import { StudentPersonalityCard } from '../components/StudentPersonalityCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ExamResult } from '../types';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const RESULT_BADGE: Record<ExamResult['subjects'][number]['result'], string> = {
  pass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  fail: 'bg-rose-50 text-rose-800 border border-rose-200',
  na: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function barColors(pct?: number) {
  const v = pct ?? 0;
  if (v >= 85) return { fill: '#059669', track: '#D1FAE5' };
  if (v >= 70) return { fill: '#2563EB', track: '#DBEAFE' };
  if (v >= 50) return { fill: '#D97706', track: '#FEF3C7' };
  return { fill: '#E11D48', track: '#FFE4E6' };
}

function ExamCard({ exam }: { exam: ExamResult }) {
  const overall = exam.overallPercentage;
  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-white px-5 py-4 sm:px-6 border-b border-indigo-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-bold text-[#1B2A4E] truncate m-0">{exam.examName}</p>
            {exam.termLabel && <p className="text-xs sm:text-sm text-[#55607A] m-0 mt-0.5">{exam.termLabel}</p>}
          </div>
        </div>
        {typeof overall === 'number' && (
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-right shrink-0 shadow-2xs">
            <p className="text-xl font-bold text-indigo-700 tabular-nums m-0">{overall}%</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#55607A] m-0">Overall</p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 sm:px-6 divide-y divide-[#EFEAE0]">
        {exam.subjects.map((s) => {
          const colors = barColors(s.percentage);
          return (
            <div key={s.subject} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm sm:text-base font-semibold text-[#1B2A4E]">{s.subject}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {typeof s.percentage === 'number' && (
                    <span className="text-sm sm:text-base font-bold text-[#1B2A4E] tabular-nums">
                      {s.percentage}%
                    </span>
                  )}
                  {s.grade && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      Grade {s.grade}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${RESULT_BADGE[s.result]}`}>
                    {s.result === 'pass' ? 'Pass' : s.result === 'fail' ? 'Needs support' : '—'}
                  </span>
                </div>
              </div>
              {typeof s.percentage === 'number' && (
                <progress
                  value={s.percentage}
                  max={100}
                  aria-label={`${s.subject}: ${s.percentage}%`}
                  className="pw-progress w-full h-1.5 mt-2 block"
                  style={
                    {
                      '--pw-fill': colors.fill,
                      '--pw-track': colors.track,
                    } as CSSProperties
                  }
                />
              )}
            </div>
          );
        })}
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

  const { data: reportCard } = useQuery({
    queryKey: ['parent-report-card', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getReportCard(activeChild!._id),
    enabled: !!activeChild,
  });

  if (workspaceLoading || (isLoading && !data)) {
    return (
      <div className="min-h-screen bg-[#FBF8F3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-hidden="true">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild || isError || !data) {
    return (
      <div className="min-h-screen bg-[#FBF8F3]">
        <EmptyState
          icon={GraduationCap}
          title={!activeChild ? 'No children linked yet' : 'Could not load academics'}
          description={!activeChild ? "Ask the school office to link your child's profile to this account." : 'Please try again shortly.'}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <ParentScreenHeader
        title="Mark Report & Academics"
        subtitle={`${data.child.name}'s exam marks, report card & personality profile`}
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
        {/* Colourful Report Card Banner (always accessible!) */}
        <motion.button
          type="button"
          onClick={() => navigate('/parent/academics/report-card')}
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          className="w-full flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#4F46E5] text-white shadow-sm px-5 py-5 sm:px-6 text-left hover:brightness-105 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-white" strokeWidth={1.9} />
          </div>
          <span className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-200">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {reportCard?.available ? 'Published & Ready to Print' : 'Interactive Progress View'}
            </span>
            <span className="block text-base sm:text-lg font-bold text-white mt-0.5">
              {reportCard?.available ? 'View Term Report Card & Printable PDF' : 'Open Digital Report Card & Personality Profile'}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-white/80 shrink-0" strokeWidth={2.2} />
        </motion.button>

        {data.subjectTrend.length > 0 && (
          <motion.section
            variants={fadeUp}
            transition={{ duration: 0.25 }}
            aria-label="Subject progress"
            className="bg-white rounded-2xl border border-indigo-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <p className="text-lg font-bold text-[#1B2A4E] m-0">Subject-wise Mark Progress</p>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {data.subjectTrend.length} Subjects
              </span>
            </div>
            <div className="space-y-4">
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
              title="No published exam results yet"
              description="Exam marks will appear here as soon as the school publishes them."
            />
          </motion.div>
        ) : (
          data.exams.map((exam) => (
            <motion.div key={exam.examId} variants={fadeUp} transition={{ duration: 0.25 }}>
              <ExamCard exam={exam} />
            </motion.div>
          ))
        )}

        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <StudentPersonalityCard
            child={activeChild}
            subjects={data.subjectTrend}
            reportCard={reportCard?.reportCard}
            template={reportCard?.template}
          />
        </motion.div>
      </motion.main>
    </div>
  );
}

export default AcademicsPage;
