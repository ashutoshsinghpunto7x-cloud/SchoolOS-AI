import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Printer,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { goBackOrFallback } from '@/lib/navigation';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { StudentPersonalityCard } from '../components/StudentPersonalityCard';
import { SubjectProgress } from '../components/SubjectProgress';
import { TermReportCardDocument } from '@/features/term-report-cards/components/TermReportCardDocument';
import { EmptyState } from '@/components/ui/EmptyState';

const DOC_WIDTH_PX = 1122; // 297mm at 96dpi (landscape A4)

function useFitScale() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth - 16) / DOC_WIDTH_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { wrapperRef, scale };
}

function scoreTone(pct: number) {
  if (pct >= 85) return { fill: '#059669', track: '#D1FAE5', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (pct >= 70) return { fill: '#2563EB', track: '#DBEAFE', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
  if (pct >= 50) return { fill: '#D97706', track: '#FEF3C7', badge: 'bg-amber-50 text-amber-900 border-amber-200' };
  return { fill: '#E11D48', track: '#FFE4E6', badge: 'bg-rose-50 text-rose-800 border-rose-200' };
}

export function ReportCardPage() {
  const navigate = useNavigate();
  const { data: workspace, activeChild, isLoading: workspaceLoading } = useParentWorkspace();
  const [printing, setPrinting] = useState(false);
  const [mode, setMode] = useState<'interactive' | 'sheet'>('interactive');
  const printAreaId = `parent-report-card-print-${useId().replace(/[:]/g, '')}`;
  const { wrapperRef, scale } = useFitScale();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['parent-report-card', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getReportCard(activeChild!._id),
    enabled: !!activeChild,
  });

  const { data: academics } = useQuery({
    queryKey: ['parent-academics', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getAcademics(activeChild!._id),
    enabled: !!activeChild,
  });

  useEffect(() => {
    if (!printing) return;
    const reset = () => {
      setPrinting(false);
      window.removeEventListener('afterprint', reset);
    };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('afterprint', reset);
    };
  }, [printing]);

  const loading = workspaceLoading || (isLoading && !data);
  const hasPublishedSheet = !!(data?.available && data.reportCard && data.template && data.student);

  return (
    <div className="min-h-screen bg-[#FBF8F3] font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]">
      {printing && (
        <style>{`
          @page { size: A4 landscape; margin: 0; }
          @media print {
            body * { visibility: hidden; }
            #${printAreaId}, #${printAreaId} * { visibility: visible; }
            #${printAreaId} { position: absolute; top: 0; left: 0; }
          }
        `}</style>
      )}

      <header className="print:hidden border-b border-[#E8E2D6] bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={() => goBackOrFallback(navigate, '/parent/academics')}
            aria-label="Go back to previous screen"
            className="w-10 h-10 -ml-1 flex items-center justify-center rounded-xl hover:bg-[#F5F1E8] transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-[#1B2A4E]" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#1B2A4E] truncate m-0">
              Student Report Card
            </h1>
          </div>

          {hasPublishedSheet && (
            <div className="hidden sm:inline-flex items-center p-1 rounded-full bg-[#FBF8F3] border border-[#E8E2D6]">
              <button
                type="button"
                onClick={() => setMode('interactive')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                  mode === 'interactive' ? 'bg-[#1B2A4E] text-white' : 'text-[#55607A] hover:text-[#1B2A4E]',
                )}
              >
                Interactive View
              </button>
              <button
                type="button"
                onClick={() => setMode('sheet')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                  mode === 'sheet' ? 'bg-[#1B2A4E] text-white' : 'text-[#55607A] hover:text-[#1B2A4E]',
                )}
              >
                Official Sheet
              </button>
            </div>
          )}

          {hasPublishedSheet && (
            <button
              type="button"
              onClick={() => setPrinting(true)}
              className="h-10 px-4 rounded-xl bg-[#1B2A4E] hover:bg-[#15223E] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Print / Save PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <div className="h-44 bg-white/70 border border-[#E8E2D6] rounded-2xl animate-pulse" />
          <div className="h-80 bg-white/70 border border-[#E8E2D6] rounded-2xl animate-pulse" />
        </div>
      ) : !activeChild || isError ? (
        <EmptyState
          icon={FileText}
          title="Could not load the report card"
          description="Please try again shortly."
        />
      ) : hasPublishedSheet && mode === 'sheet' ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="print:hidden py-6 space-y-4"
        >
          <div className="max-w-5xl mx-auto px-4 sm:hidden flex justify-center">
            <div className="inline-flex items-center p-1 rounded-full bg-white border border-[#E8E2D6]">
              <button
                type="button"
                onClick={() => setMode('interactive')}
                className="px-3 py-1 rounded-full text-xs font-semibold text-[#55607A]"
              >
                Interactive View
              </button>
              <button
                type="button"
                onClick={() => setMode('sheet')}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1B2A4E] text-white"
              >
                Official Sheet
              </button>
            </div>
          </div>

          <div ref={wrapperRef} className="max-w-5xl mx-auto px-2 sm:px-6">
            <div
              className="mx-auto shadow-md rounded-xl overflow-hidden bg-white border border-[#E8E2D6]"
              style={{ width: DOC_WIDTH_PX * scale, height: DOC_WIDTH_PX * (210 / 297) * scale }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: DOC_WIDTH_PX }}>
                <TermReportCardDocument
                  reportCard={data!.reportCard!}
                  template={data!.template!}
                  student={data!.student!}
                  schoolSettings={data!.schoolSettings}
                  qrDataUri={data!.qrDataUri}
                  hideWarnings
                />
              </div>
            </div>
          </div>
        </motion.div>
      ) : hasPublishedSheet ? (
        /* ── Interactive Colourful Published Report Card ────────────────── */
        <InteractivePublishedReportCard
          activeChild={activeChild}
          reportCard={data!.reportCard!}
          template={data!.template!}
          student={data!.student!}
          subjects={workspace?.subjects}
          onSwitchToSheet={() => setMode('sheet')}
          onNavigate={navigate}
        />
      ) : (
        /* ── Live Progress & Personality Snapshot before Term Sheet is Published ── */
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
        >
          <section className="rounded-2xl bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#4F46E5] text-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  Live Academic Progress Card
                </span>
                <h2 className="text-2xl font-bold mt-2.5 m-0">{activeChild.name}</h2>
                <p className="text-sm text-white/80 m-0 mt-1">
                  Class {activeChild.grade} · Section {activeChild.section} — Official printable term sheet will appear here once published by the class teacher.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-white/12 border border-white/20 rounded-2xl px-4 py-3 shrink-0">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/75 m-0">Current Average</p>
                  <p className="text-2xl font-bold tabular-nums m-0 mt-0.5">
                    {activeChild.academicAverage > 0 ? `${Math.round(activeChild.academicAverage * 10)}%` : '—'}
                  </p>
                </div>
                <div className="h-9 w-px bg-white/20" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/75 m-0">Attendance</p>
                  <p className="text-2xl font-bold tabular-nums m-0 mt-0.5">{activeChild.attendancePercent}%</p>
                </div>
              </div>
            </div>
          </section>

          {(academics?.subjectTrend?.length ?? 0) > 0 && (
            <section className="rounded-2xl bg-white border border-indigo-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1B2A4E] m-0">Subject-wise Mark Report</h3>
                  <p className="text-xs text-[#55607A] m-0">Latest published exam scores</p>
                </div>
              </div>
              <div className="space-y-4">
                {academics!.subjectTrend.map((s) => (
                  <SubjectProgress key={s._id} {...s} />
                ))}
              </div>
            </section>
          )}

          <StudentPersonalityCard child={activeChild} subjects={workspace?.subjects ?? academics?.subjectTrend} />

          {/* Quick links to the other two core reports */}
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => navigate('/parent/attendance')}
              className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 p-4 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-950 m-0">Attendance Report</p>
                  <p className="text-xs text-emerald-800 m-0 mt-0.5">{activeChild.attendancePercent}% present this term</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-800">Open →</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/parent/fees')}
              className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 p-4 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-950 m-0">Fee History &amp; Dues</p>
                  <p className="text-xs text-amber-800 m-0 mt-0.5">
                    {activeChild.feeStatus === 'paid'
                      ? 'All school fees paid'
                      : `₹${(activeChild.feeDueAmount ?? 0).toLocaleString('en-IN')} pending`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-900">Open →</span>
            </button>
          </div>
        </motion.main>
      )}

      {printing && hasPublishedSheet && (
        <div id={printAreaId} className="hidden print:block">
          <TermReportCardDocument
            reportCard={data!.reportCard!}
            template={data!.template!}
            student={data!.student!}
            schoolSettings={data!.schoolSettings}
            qrDataUri={data!.qrDataUri}
            hideWarnings
          />
        </div>
      )}
    </div>
  );
}

function InteractivePublishedReportCard({
  activeChild,
  reportCard,
  template,
  student,
  subjects,
  onSwitchToSheet,
  onNavigate,
}: {
  activeChild: NonNullable<ReturnType<typeof useParentWorkspace>['activeChild']>;
  reportCard: NonNullable<NonNullable<Awaited<ReturnType<typeof parentWorkspaceApi.getReportCard>>>['reportCard']>;
  template: NonNullable<NonNullable<Awaited<ReturnType<typeof parentWorkspaceApi.getReportCard>>>['template']>;
  student: NonNullable<NonNullable<Awaited<ReturnType<typeof parentWorkspaceApi.getReportCard>>>['student']>;
  subjects?: NonNullable<ReturnType<typeof useParentWorkspace>['data']>['subjects'];
  onSwitchToSheet: () => void;
  onNavigate: (path: string) => void;
}) {
  const firstBySubject = new Map(reportCard.firstTerm.subjectRows.map((r) => [r.subjectId, r]));
  const finalBySubject = new Map(reportCard.finalTerm.subjectRows.map((r) => [r.subjectId, r]));
  const grandPct = Math.round(reportCard.grandAveragePercent || 0);

  const term1Att = reportCard.firstTerm.attendance;
  const term2Att = reportCard.finalTerm.attendance;
  const totalPresent = (term1Att?.present ?? 0) + (term2Att?.present ?? 0);
  const totalWorking = (term1Att?.workingDays ?? 0) + (term2Att?.workingDays ?? 0);
  const reportAttPct = totalWorking > 0 ? Math.round((totalPresent / totalWorking) * 100) : activeChild.attendancePercent;

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="print:hidden max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
    >
      <div className="sm:hidden flex justify-center">
        <div className="inline-flex items-center p-1 rounded-full bg-white border border-[#E8E2D6]">
          <button type="button" className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1B2A4E] text-white">
            Interactive View
          </button>
          <button
            type="button"
            onClick={onSwitchToSheet}
            className="px-3 py-1 rounded-full text-xs font-semibold text-[#55607A]"
          >
            Official Sheet
          </button>
        </div>
      </div>

      {/* Vibrant Hero Summary */}
      <section className="rounded-2xl bg-gradient-to-br from-[#1B2A4E] via-[#254A9A] to-[#4338CA] text-white p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white">
                Academic Year {reportCard.academicYear}
              </span>
              {reportCard.summary.promotionStatus === 'promoted' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/25 text-emerald-100 border border-emerald-300/30">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Promoted
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2.5 m-0">{student.fullName}</h2>
            <p className="text-sm text-white/80 m-0 mt-1">
              Class {student.class}–{student.section}
              {student.rollNumber ? ` · Roll No. ${student.rollNumber}` : ''}
              {student.admissionNumber ? ` · Adm #${student.admissionNumber}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 border border-white/15 rounded-2xl p-4 shrink-0">
            <div className="pw-ring-wrap">
              <progress
                value={grandPct}
                max={100}
                aria-label="Overall percentage"
                aria-valuetext={`${grandPct}%`}
                className="pw-ring"
                style={
                  {
                    '--size': '68px',
                    '--thickness': '7px',
                    '--pw-ring-val': grandPct,
                    '--fill-color': '#34D399',
                    '--track-color': 'rgba(255,255,255,0.2)',
                  } as CSSProperties
                }
              />
              <div className="pw-ring-label text-white" aria-hidden="true">
                <span className="text-base font-bold tabular-nums">{grandPct}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-white/70 m-0">Grand Total</p>
              <p className="text-xl font-bold tabular-nums m-0">
                {reportCard.grandTotalObtained} / {reportCard.grandTotalMax}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/85">
                {reportCard.overallGrade && (
                  <span className="px-2 py-0.5 rounded-md bg-white/15 font-semibold">
                    Grade {reportCard.overallGrade}
                  </span>
                )}
                {reportCard.summary.rank && (
                  <span>
                    Rank {reportCard.summary.rank}/{reportCard.summary.classSize}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Term 1 / Term 2 / Attendance mini colour strip */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/15">
          <div className="rounded-xl bg-white/10 px-3.5 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-sky-200 m-0">First Term</p>
            <p className="text-lg font-bold tabular-nums m-0 mt-0.5">
              {reportCard.firstTerm.termTotalMax > 0 ? `${reportCard.firstTerm.termPercentage}%` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3.5 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-indigo-200 m-0">Final Term</p>
            <p className="text-lg font-bold tabular-nums m-0 mt-0.5">
              {reportCard.finalTerm.termTotalMax > 0 ? `${reportCard.finalTerm.termPercentage}%` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-400/20 border border-emerald-300/25 px-3.5 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-emerald-100 m-0">Attendance</p>
            <p className="text-lg font-bold tabular-nums m-0 mt-0.5">
              {totalWorking > 0 ? `${totalPresent}/${totalWorking}` : `${reportAttPct}%`}
            </p>
          </div>
        </div>
      </section>

      {/* Colourful Subject-wise Marks Card */}
      <section className="rounded-2xl bg-white border border-indigo-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#1B2A4E] m-0">Subject-wise Mark Report</h3>
              <p className="text-xs text-[#55607A] m-0">First Term, Final Term &amp; overall performance</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          {template.subjects.map((subj) => {
            const id = subj._id ?? '';
            const first = firstBySubject.get(id);
            const final = finalBySubject.get(id);
            const graded = (first?.evaluationType ?? final?.evaluationType) === 'grade';

            if (graded) {
              const g = final?.grade ?? first?.grade ?? '—';
              return (
                <div key={id || subj.name} className="rounded-xl border border-[#E8E2D6] bg-[#FBF8F3]/60 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1B2A4E] m-0">{subj.name}</p>
                    <p className="text-xs text-[#55607A] m-0 mt-0.5">
                      Term I: {first?.grade ?? '—'} · Term II: {final?.grade ?? '—'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    Grade {g}
                  </span>
                </div>
              );
            }

            const obtained = (first?.termTotal ?? 0) + (final?.termTotal ?? 0);
            const max = (first?.termMaxMarks ?? 0) + (final?.termMaxMarks ?? 0);
            const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
            const tone = scoreTone(pct);
            const grade = final?.grade ?? first?.grade;

            return (
              <div key={id || subj.name} className="rounded-xl border border-[#E8E2D6] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#1B2A4E] m-0">{subj.name}</p>
                    <p className="text-xs text-[#55607A] m-0 mt-0.5 tabular-nums">
                      Term I: {first?.termTotal ?? '—'}/{first?.termMaxMarks ?? 0} · Term II: {final?.termTotal ?? '—'}/{final?.termMaxMarks ?? 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {grade && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {grade}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border tabular-nums ${tone.badge}`}>
                      {max > 0 ? `${pct}%` : '—'}
                    </span>
                  </div>
                </div>

                <progress
                  value={pct}
                  max={100}
                  aria-label={`${subj.name}: ${pct}%`}
                  className="pw-progress w-full h-2 mt-3 block"
                  style={
                    {
                      '--pw-fill': tone.fill,
                      '--pw-track': tone.track,
                    } as CSSProperties
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Student Personality Card */}
      <StudentPersonalityCard
        child={activeChild}
        subjects={subjects}
        reportCard={reportCard}
        template={template}
      />

      {/* Cross-links to Attendance Report & Fee History */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('/parent/attendance')}
          className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-emerald-950 m-0">Attendance Report</p>
              <p className="text-xs text-emerald-800 m-0 mt-0.5">{reportAttPct}% attendance recorded</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-800">View →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/parent/fees')}
          className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 p-4 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-950 m-0">Fee History &amp; Receipts</p>
              <p className="text-xs text-amber-800 m-0 mt-0.5">
                {activeChild.feeStatus === 'paid'
                  ? 'All dues cleared'
                  : `₹${(activeChild.feeDueAmount ?? 0).toLocaleString('en-IN')} due`}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-900">View →</span>
        </button>
      </div>
    </motion.main>
  );
}

export default ReportCardPage;
