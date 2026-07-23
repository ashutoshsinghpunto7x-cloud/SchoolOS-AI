import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, AlertCircle, Loader2, CheckCircle2, Lock, Send, Save, Info, Download,
} from 'lucide-react';
import { useMarksEntryTable, useMarksSummary, useBulkUpsertMarks, useSubmitMarksForReview } from '../hooks/useMarks';
import { avatarColorFor } from '@/features/teacher-workspace/utils/avatarColor';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSmartDraft } from '@/hooks/useSmartDraft';
import { buildDraftKey } from '@/lib/drafts/buildDraftKey';
import { RecoveryBanner } from '@/components/drafts/RecoveryBanner';
import { OfflineBanner } from '@/components/drafts/OfflineBanner';
import { DraftStatusIndicator } from '@/components/drafts/DraftStatusIndicator';
import type { ComponentScore, ComponentStatus, MarksBatchTarget, MarksWorkflowStatus } from '@schoolos/types';

// ── Row state ─────────────────────────────────────────────────────────────────

interface RowState {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  componentScores: ComponentScore[];
  remark: string;
  workflowStatus: MarksWorkflowStatus | null; // null = never saved
  total?: number;
  percentage?: number;
}

// Teachers only get Present/Absent day-to-day — Exempt/Medical/Not Assessed
// are edge cases an admin sets, not something to offer on every row. A row
// that already carries one of those (set elsewhere) still displays correctly
// via STATUS_OPTIONS_EXTRA below, it just isn't offered as a new choice.
const STATUS_OPTIONS: { value: ComponentStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
];
const STATUS_LABELS: Record<ComponentStatus, string> = {
  present: 'Present', absent: 'Absent', exempt: 'Exempt', medical: 'Medical', not_assessed: 'Not Assessed',
};

const WORKFLOW_BADGE: Record<MarksWorkflowStatus, { label: string; className: string }> = {
  draft:             { label: 'Draft',            className: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/40' },
  submitted:         { label: 'Submitted',         className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  needs_correction:  { label: 'Needs Correction',  className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  approved:          { label: 'Approved',          className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  published:         { label: 'Published',         className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  locked:            { label: 'Locked',            className: 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-white/50' },
  reopened:          { label: 'Reopened',          className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' },
};

function rowIsEditable(status: MarksWorkflowStatus | null): boolean {
  return status === null || status === 'draft' || status === 'needs_correction' || status === 'reopened';
}

// A row is "complete" once every present-status component has a valid score
// in range — the server rejects a bulk save outright if any record in the
// batch fails this, so an untouched row (still defaulted to present/no
// score) must never be sent until the teacher has actually filled it in.
function rowIsComplete(row: RowState, maxByName: Map<string, number>): boolean {
  return row.componentScores.every((cs) => {
    if (cs.status !== 'present') return true;
    if (typeof cs.score !== 'number') return false;
    const max = maxByName.get(cs.componentName) ?? 0;
    return cs.score >= 0 && cs.score <= max;
  });
}

// A row is "untouched" when every component is still at its just-loaded
// default (present, no score) — distinct from "complete": a row can be
// invalid (partially filled) without being untouched.
function rowIsUntouched(row: RowState): boolean {
  return row.componentScores.every((cs) => cs.status === 'present' && typeof cs.score !== 'number');
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-3 gap-3 animate-pulse">
      <div className="w-6 h-4 bg-gray-100 dark:bg-white/10 rounded shrink-0" />
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 shrink-0" />
      <div className="flex-1 h-4 bg-gray-100 dark:bg-white/10 rounded w-32" />
    </div>
  );
}

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KpiPill({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'error' | 'ok' }) {
  const toneClass =
    tone === 'error' ? 'text-red-600 dark:text-red-400'
    : tone === 'warn' ? 'text-amber-600 dark:text-amber-400'
    : tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-gray-900 dark:text-white';
  return (
    <div className="flex-1 min-w-[84px] bg-white teacher-glass-card rounded-xl border border-gray-100 dark:border-transparent px-3 py-2.5 text-center shrink-0">
      <p className={cn('text-lg font-bold tabular-nums', toneClass)}>{value}</p>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────

function StudentRow({
  row, index, maxByComponent, editable, onChangeScore, onChangeStatus,
}: {
  row: RowState;
  index: number;
  maxByComponent: { name: string; maxMarks: number }[];
  editable: boolean;
  onChangeScore: (studentId: string, componentName: string, score: number | undefined) => void;
  onChangeStatus: (studentId: string, status: ComponentStatus) => void;
}) {
  const color = avatarColorFor(row.studentId);
  const initials = row.fullName.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
  const rowStatus = row.componentScores[0]?.status ?? 'present';
  const isPresent = rowStatus === 'present';
  const canEdit = editable;
  // Keeps an already-set Exempt/Medical/Not Assessed status visible & selected
  // even though it's not one of the two options teachers can newly pick.
  const statusOptions = STATUS_OPTIONS.some((o) => o.value === rowStatus)
    ? STATUS_OPTIONS
    : [{ value: rowStatus, label: STATUS_LABELS[rowStatus] }, ...STATUS_OPTIONS];

  return (
    <div className="px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 dark:text-white/30 w-6 text-right shrink-0 font-mono tabular-nums">{index + 1}</span>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', color.bg)}>
          <span className={cn('text-[10px] font-bold', color.text)}>{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.fullName}</p>
          {row.rollNumber && <p className="text-[11px] text-gray-400 dark:text-white/30">Roll No: {row.rollNumber}</p>}
        </div>
        {row.workflowStatus && (
          <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full shrink-0', WORKFLOW_BADGE[row.workflowStatus].className)}>
            {WORKFLOW_BADGE[row.workflowStatus].label}
          </span>
        )}
        <select
          value={rowStatus}
          disabled={!canEdit}
          onChange={(e) => onChangeStatus(row.studentId, e.target.value as ComponentStatus)}
          className="text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-white/70 px-2 py-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
        >
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isPresent && (
        <div className="flex flex-wrap gap-2 mt-2.5 pl-9">
          {maxByComponent.map((c) => {
            const cs = row.componentScores.find((s) => s.componentName === c.name);
            const value = cs?.score;
            const invalid = typeof value === 'number' && (value < 0 || value > c.maxMarks);
            return (
              <label key={c.name} className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-white/30">{c.name} <span className="tabular-nums">/{c.maxMarks}</span></span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={c.maxMarks}
                  value={value ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Number(e.target.value);
                    onChangeScore(row.studentId, c.name, v);
                  }}
                  className={cn(
                    'w-16 h-9 px-2 rounded-lg border text-sm tabular-nums text-gray-900 dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
                    invalid ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 dark:border-white/10 focus:ring-[#A855F7]/30',
                  )}
                />
              </label>
            );
          })}
          {row.total !== undefined && (
            <div className="flex flex-col gap-0.5 ml-1">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-white/30">Total</span>
              <span className="h-9 flex items-center text-sm font-bold text-gray-700 dark:text-white/70 tabular-nums">
                {row.total}{row.percentage !== undefined ? ` (${row.percentage}%)` : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MarksEntryPage() {
  const { cls, section, subjectName: encodedSubject, examId } = useParams<{
    cls: string; section: string; subjectName: string; examId: string;
  }>();
  const subjectName = encodedSubject ? decodeURIComponent(encodedSubject) : undefined;
  const navigate = useNavigate();

  const target: Partial<MarksBatchTarget> = { examId, class: cls, section, subjectName };
  const { data: table, isLoading, isError } = useMarksEntryTable(target);
  const { data: summary } = useMarksSummary(target);
  const { mutateAsync: bulkSave, isPending: isSaving } = useBulkUpsertMarks();
  const { mutateAsync: submitForReview, isPending: isSubmitting } = useSubmitMarksForReview();

  const [rows, setRows] = useState<RowState[]>([]);
  const [dirty, setDirty] = useState(false);

  // ── Smart draft (client-side autosave + crash recovery) ───────────────────
  const { user } = useAuth();
  const draftKey = user && cls && section && subjectName && examId
    ? buildDraftKey({ schoolId: user.schoolId, teacherId: user.userId, module: 'marks', examId, class: cls, section, subjectName })
    : null;
  const draft = useSmartDraft(draftKey, rows, { enabled: !!draftKey && rows.length > 0 });
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  useEffect(() => {
    if (draft.hasRecoverableDraft) setShowRecoveryBanner(true);
  }, [draft.hasRecoverableDraft]);

  function handleRestoreDraft() {
    const restored = draft.restore();
    if (restored) { setRows(restored); setDirty(true); }
    setShowRecoveryBanner(false);
  }

  function handleDiscardDraft() {
    draft.discard();
    setShowRecoveryBanner(false);
  }

  useEffect(() => {
    if (!table) return;
    setRows(
      table.rows.map((r): RowState => {
        const existing = r.marks;
        return {
          studentId: r.studentId,
          fullName: r.fullName,
          rollNumber: r.rollNumber,
          componentScores: existing?.componentScores.length
            ? existing.componentScores
            : table.exam.components.map((c) => ({ componentName: c.name, status: 'present' as ComponentStatus })),
          remark: existing?.remark ?? '',
          workflowStatus: existing?.workflowStatus ?? null,
          total: existing?.total,
          percentage: existing?.percentage,
        };
      }),
    );
    setDirty(false);
  }, [table]);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); e.returnValue = ''; }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm('You have unsaved marks. Leave without saving?');
    if (leave) blocker.proceed(); else blocker.reset();
  }, [blocker]);

  function handleChangeScore(studentId: string, componentName: string, score: number | undefined) {
    setRows((prev) => prev.map((r) => {
      if (r.studentId !== studentId) return r;
      return {
        ...r,
        componentScores: r.componentScores.map((cs) => (cs.componentName === componentName ? { ...cs, score } : cs)),
      };
    }));
    setDirty(true);
  }

  function handleChangeStatus(studentId: string, status: ComponentStatus) {
    setRows((prev) => prev.map((r) => (
      r.studentId !== studentId ? r : { ...r, componentScores: r.componentScores.map((cs) => ({ ...cs, status })) }
    )));
    setDirty(true);
  }

  const editableRows = rows.filter((r) => rowIsEditable(r.workflowStatus));
  const allEditable = rows.length > 0 && editableRows.length === rows.length;
  const someLocked = rows.length > 0 && editableRows.length === 0;

  const maxByComponentName = useMemo(
    () => new Map((table?.exam.components ?? []).map((c) => [c.name, c.maxMarks])),
    [table],
  );

  // "Invalid" is reserved for rows the teacher has actually started filling
  // in but left incomplete or out of range — an untouched row isn't an
  // error, it's just not saved yet (see rowIsComplete/rowIsUntouched above).
  const hasInvalid = useMemo(
    () => rows.some((r) => !rowIsUntouched(r) && !rowIsComplete(r, maxByComponentName)),
    [rows, maxByComponentName],
  );

  const unfilledCount = rows.filter((r) => !rowIsComplete(r, maxByComponentName)).length;

  async function handleSaveDraft() {
    if (!cls || !section || !examId || !subjectName) return;
    const ready = editableRows.filter((r) => rowIsComplete(r, maxByComponentName) && !rowIsUntouched(r));
    if (ready.length === 0) {
      toast.error('Nothing to save yet', { description: 'Enter at least one student’s marks first.' });
      return;
    }
    try {
      await bulkSave({
        examId, class: cls, section, subjectName,
        records: ready.map((r) => ({ studentId: r.studentId, componentScores: r.componentScores, remark: r.remark || undefined })),
      });
      setDirty(false);
      draft.markSubmitted();
      toast.success('Draft saved', { description: `${ready.length} of ${rows.length} students saved` });
    } catch (err) {
      toast.error('Could not save marks', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    }
  }

  async function handleSubmit() {
    if (!cls || !section || !examId || !subjectName) return;
    if (dirty) { toast.error('Save your changes before submitting'); return; }
    try {
      const result = await submitForReview({ examId, class: cls, section, subjectName });
      draft.markSubmitted();
      toast.success(`Submitted for review`, { description: `${result.updated} record(s) sent to your admin/principal` });
    } catch (err) {
      toast.error('Could not submit', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    }
  }

  function handleDownloadMarks() {
    if (!table) return;
    const components = table.exam.components;
    downloadCsv(
      `Marks_Class${cls}-${section}_${subjectName}_${table.exam.name}.csv`,
      ['Roll No', 'Name', 'Status', ...components.map((c) => `${c.name} (/${c.maxMarks})`), 'Total', 'Percentage'],
      rows.map((r) => {
        const status = r.componentScores[0]?.status ?? 'present';
        const isPresent = status === 'present';
        return [
          r.rollNumber ?? '',
          r.fullName,
          STATUS_LABELS[status],
          ...components.map((c) => {
            if (!isPresent) return '';
            const score = r.componentScores.find((cs) => cs.componentName === c.name)?.score;
            return score ?? '';
          }),
          isPresent ? r.total ?? '' : '',
          isPresent && r.percentage !== undefined ? `${r.percentage}%` : '',
        ];
      }),
    );
  }

  const isLoadingAny = isLoading;
  const submitDisabled = isSubmitting || dirty || hasInvalid || unfilledCount === rows.length || rows.length === 0 || !allEditable;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0518] flex flex-col">
      <div className="bg-white dark:bg-[#0F0821] border-b border-gray-100 dark:border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/teacher/marks')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">
              Class {cls} – {section} · {subjectName}
            </h1>
            {table && <p className="text-xs text-gray-400 dark:text-white/40 truncate">{table.exam.name}</p>}
          </div>
          <DraftStatusIndicator status={draft.status} lastSavedAt={draft.lastSavedAt} />
          <button
            type="button"
            onClick={handleDownloadMarks}
            disabled={!table || rows.length === 0}
            className="h-9 px-3 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 flex items-center gap-1.5 shrink-0 transition-colors"
            title="Download marks (CSV)"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>

        {summary && (
          <div className="flex gap-2 mt-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <KpiPill label="Total" value={summary.totalStudents} />
            <KpiPill label="Completed" value={summary.completed} tone="ok" />
            <KpiPill label="Pending" value={summary.pending} tone={summary.pending > 0 ? 'warn' : undefined} />
            <KpiPill label="Submitted" value={summary.submitted} />
            <KpiPill label="Locked" value={summary.locked} />
          </div>
        )}
      </div>

      {isLoadingAny ? (
        <div className="mx-4 mt-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : isError || !table ? (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Couldn't load this exam</p>
            <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Check your connection and try again.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Recovered/offline draft banners */}
          {showRecoveryBanner && (
            <RecoveryBanner savedAt={draft.lastSavedAt} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
          )}
          {draft.isOffline && <OfflineBanner />}

          {table.exam.status === 'draft' && (
            <div className="mx-4 mt-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">This exam is still in draft — ask an admin to configure it.</p>
            </div>
          )}
          {someLocked && (
            <div className="mx-4 mt-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-500 dark:text-white/40 shrink-0" />
              <p className="text-sm font-semibold text-gray-600 dark:text-white/60">
                These marks have moved past draft — ask an admin to send them back or reopen them to edit.
              </p>
            </div>
          )}

          <div className="mx-4 mt-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm overflow-hidden">
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-white/50">No active students in this class</p>
              </div>
            ) : (
              rows.map((row, i) => (
                <StudentRow
                  key={row.studentId}
                  row={row}
                  index={i}
                  maxByComponent={table.exam.components}
                  editable={rowIsEditable(row.workflowStatus)}
                  onChangeScore={handleChangeScore}
                  onChangeStatus={handleChangeStatus}
                />
              ))
            )}
          </div>

          {allEditable && rows.length > 0 && (
            <>
              <div className="h-24" aria-hidden="true" />
              <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B0518] border-t border-gray-200/60 dark:border-white/5 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving || !dirty}
                  className="flex-1 h-12 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-white/80 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitDisabled}
                  title={unfilledCount > 0 ? `${unfilledCount} student(s) have missing marks` : hasInvalid ? 'Fix invalid marks first' : dirty ? 'Save your changes first' : undefined}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:from-violet-700 hover:to-pink-600 disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for Review
                </button>
              </div>
            </>
          )}

          {!allEditable && rows.length > 0 && summary && summary.published + summary.locked === rows.length && (
            <div className="mx-4 mt-4 mb-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">All marks published for this exam.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
