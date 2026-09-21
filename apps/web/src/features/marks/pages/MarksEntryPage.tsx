import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, useBlocker } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, AlertCircle, Loader2, CheckCircle2, Lock, Send, Save, Info, Download, Sparkles, ListTree, Undo2, RotateCcw,
} from 'lucide-react';
import {
  useMarksEntryTable, useMarksSummary, useBulkUpsertMarks, useSubmitMarksForReview,
  useApproveMarks, useRequestMarksCorrection, usePublishMarks, useLockMarks, useReopenMarks, marksKeys,
} from '../hooks/useMarks';
import { marksApi } from '../api/marks.api';
import { AiCaptureModal } from '../components/AiCaptureModal';
import { avatarColorFor } from '@/features/teacher-workspace/utils/avatarColor';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSmartDraft } from '@/hooks/useSmartDraft';
import { buildDraftKey } from '@/lib/drafts/buildDraftKey';
import { RecoveryBanner } from '@/components/drafts/RecoveryBanner';
import { OfflineBanner } from '@/components/drafts/OfflineBanner';
import { DraftStatusIndicator } from '@/components/drafts/DraftStatusIndicator';
import type {
  ComponentScore, ComponentStatus, Exam, MarksBatchTarget, MarksEntryTable, MarksExtractionResult, MarksWorkflowStatus,
} from '@schoolos/types';

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
  enteredById?: string;
  enteredByName?: string;
  enteredByRole?: string;
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

// Draft/needs_correction/reopened are always editable (any role). Beyond
// that, a teacher may keep correcting their own marks all the way through
// review — submitted/approved/published stay open to them; only an explicit
// Lock (principal/admin-only, see marks.service.ts's lock) stops them.
// Re-saving after submission pulls the record back to 'draft' server-side
// (marks.repository.ts's upsert), so it re-enters review automatically.
// Principal/admin editing is gated the other way: they use the review
// actions (Approve/Request Correction/Publish/Lock/Reopen) to move a batch
// back to an editable status rather than bypassing the workflow.
function rowIsEditable(status: MarksWorkflowStatus | null, role?: string): boolean {
  if (status === null || status === 'draft' || status === 'needs_correction' || status === 'reopened') return true;
  return role === 'teacher' && status !== 'locked';
}

// Once someone has saved a row's marks, only that same account (or an
// admin/principal, who never hit this check) may edit it further — a
// different teacher gets a read-only view instead, even though open access
// now lets them view/enter marks for any class/subject. Mirrors
// marks.service.ts's assertCanEditExisting on the server, which is the
// real enforcement; this just keeps the UI from offering an edit the save
// would reject anyway.
function rowIsLockedByOther(row: RowState, currentUserId: string | undefined, role: string | undefined): boolean {
  // A principal/admin-entered row (enteredByRole !== 'teacher') never locks
  // out the actual subject teacher — see marks.service.ts's assertCanEditExisting.
  return role === 'teacher' && !!row.enteredById && row.enteredById !== currentUserId && row.enteredByRole === 'teacher';
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
  row, index, maxByComponent, editable, lockedByOther, aiFilled, onChangeScore, onChangeStatus,
}: {
  row: RowState;
  index: number;
  maxByComponent: { name: string; maxMarks: number }[];
  editable: boolean;
  lockedByOther?: boolean;
  aiFilled?: boolean;
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
    <div className={cn('px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0', aiFilled && 'bg-violet-50/60 dark:bg-violet-500/[0.06]')}>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 dark:text-white/30 w-6 text-right shrink-0 font-mono tabular-nums">{index + 1}</span>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', color.bg)}>
          <span className={cn('text-[10px] font-bold', color.text)}>{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
            {row.fullName}
          </p>
          {row.enteredByName && (
            <p className="text-[10px] text-gray-400 dark:text-white/30 truncate flex items-center gap-1">
              {lockedByOther && <Lock className="w-2.5 h-2.5 shrink-0" />}
              Entered by {row.enteredByName}
              {lockedByOther && ' — read-only'}
            </p>
          )}
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
                    // text-base (16px), not text-sm — anything smaller makes iOS Safari
                    // auto-zoom the whole page in on focus, which is what made this
                    // field look broken/oversized on phones.
                    'w-[4.5rem] h-10 px-2 rounded-lg border text-base tabular-nums text-gray-900 dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
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

// ── Page (dispatcher) ───────────────────────────────────────────────────────
// A subject can optionally be configured (per exam, on the Exam's
// subjectConfigs — see ExamForm's "Subject Skill Breakdown") with a skill
// breakdown, e.g. English -> Literature, Language, Reading, Writing,
// Dictation/Spelling. This is purely data-driven: any subject, on any exam,
// for any class can be split this way, or not, with zero code changes. This
// outer component just checks that config (via the same entry-table fetch
// the simple page already makes — react-query dedupes it) and routes to
// whichever body applies.

export function MarksEntryPage() {
  const { cls, section, subjectName: encodedSubject, examId } = useParams<{
    cls: string; section: string; subjectName: string; examId: string;
  }>();
  const subjectName = encodedSubject ? decodeURIComponent(encodedSubject) : undefined;
  const target: Partial<MarksBatchTarget> = { examId, class: cls, section, subjectName };
  const { data: table, isLoading, isError } = useMarksEntryTable(target);

  const skills = subjectName
    ? table?.exam.subjectConfigs?.find((c) => c.name === subjectName)?.skills
    : undefined;

  if (isLoading) {
    return (
      <div className="mx-4 mt-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }
  if (isError || !table || !cls || !section || !subjectName || !examId) {
    return (
      <div className="mx-4 mt-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Couldn't load this exam</p>
          <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Check your connection and try again.</p>
        </div>
      </div>
    );
  }

  if (skills?.length) {
    return <CompoundMarksEntryPage cls={cls} section={section} subjectName={subjectName} examId={examId} skills={skills} exam={table.exam} />;
  }
  return <SimpleMarksEntryPage />;
}

// ── Simple (single-mark) subject page ───────────────────────────────────────

function SimpleMarksEntryPage() {
  const { cls, section, subjectName: encodedSubject, examId } = useParams<{
    cls: string; section: string; subjectName: string; examId: string;
  }>();
  const subjectName = encodedSubject ? decodeURIComponent(encodedSubject) : undefined;
  const navigate = useNavigate();
  // Works under both /teacher/marks/... and /principal/marks/... — derive
  // "back to the hub" from wherever this page is actually mounted rather
  // than threading a basePath prop through every nested component.
  const basePath = useLocation().pathname.split('/marks/')[0] || '/teacher';

  const target: Partial<MarksBatchTarget> = { examId, class: cls, section, subjectName };
  const { data: table, isLoading, isError } = useMarksEntryTable(target);
  const { data: summary } = useMarksSummary(target);
  const { mutateAsync: bulkSave, isPending: isSaving } = useBulkUpsertMarks();
  const { mutateAsync: submitForReview, isPending: isSubmitting } = useSubmitMarksForReview();
  const { mutateAsync: approveMarks, isPending: isApproving } = useApproveMarks();
  const { mutateAsync: requestCorrection, isPending: isRequestingCorrection } = useRequestMarksCorrection();
  const { mutateAsync: publishMarks, isPending: isPublishing } = usePublishMarks();
  const { mutateAsync: lockMarks, isPending: isLocking } = useLockMarks();
  const { mutateAsync: reopenMarks, isPending: isReopening } = useReopenMarks();

  const [rows, setRows] = useState<RowState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiFilledIds, setAiFilledIds] = useState<Set<string>>(new Set());

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
          enteredById: existing?.enteredById,
          enteredByName: existing?.enteredByName,
          enteredByRole: existing?.enteredByRole,
        };
      }),
    );
    setDirty(false);
    setAiFilledIds(new Set());
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
    setAiFilledIds((prev) => { if (!prev.has(studentId)) return prev; const next = new Set(prev); next.delete(studentId); return next; });
    setDirty(true);
  }

  function handleChangeStatus(studentId: string, status: ComponentStatus) {
    setRows((prev) => prev.map((r) => (
      r.studentId !== studentId ? r : { ...r, componentScores: r.componentScores.map((cs) => ({ ...cs, status })) }
    )));
    setAiFilledIds((prev) => { if (!prev.has(studentId)) return prev; const next = new Set(prev); next.delete(studentId); return next; });
    setDirty(true);
  }

  function handleApplyExtraction(result: MarksExtractionResult) {
    const byStudent = new Map(result.extracted.map((e) => [e.studentId, e]));
    setRows((prev) => prev.map((r) => {
      const ext = byStudent.get(r.studentId);
      if (!ext || !canEditRow(r)) return r;
      return { ...r, componentScores: ext.componentScores };
    }));
    setAiFilledIds(new Set(result.extracted.map((e) => e.studentId)));
    setDirty(true);
    toast.success(`AI filled ${result.extracted.length} student${result.extracted.length === 1 ? '' : 's'}`, {
      description: 'Review the highlighted rows, then save as usual.',
    });
  }

  const isPrincipalOrAdmin = user?.role === 'principal' || user?.role === 'admin';
  const editableRows = rows.filter((r) => rowIsEditable(r.workflowStatus, user?.role));
  const allEditable = rows.length > 0 && editableRows.length === rows.length;
  const someLocked = rows.length > 0 && editableRows.length === 0;

  const canEditRow = (r: RowState) => rowIsEditable(r.workflowStatus, user?.role) && !rowIsLockedByOther(r, user?.userId, user?.role);
  const otherOwnedCount = editableRows.filter((r) => rowIsLockedByOther(r, user?.userId, user?.role)).length;

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
  // Derived from the rows already in memory rather than the server summary —
  // that way "Completed"/"Pending" reflect an AI fill or manual edit the
  // instant it happens, instead of waiting on a save + summary refetch.
  const localCompleted = rows.length - unfilledCount;
  const localPending = unfilledCount;

  async function handleSaveDraft() {
    if (!cls || !section || !examId || !subjectName) return;
    const ready = editableRows.filter((r) => canEditRow(r) && rowIsComplete(r, maxByComponentName) && !rowIsUntouched(r));
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

  async function handleApprove() {
    if (!cls || !section || !examId || !subjectName) return;
    try {
      const result = await approveMarks({ examId, class: cls, section, subjectName });
      toast.success('Marks approved', { description: `${result.updated} record(s) approved` });
    } catch (err) {
      toast.error('Could not approve', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    }
  }

  async function handleRequestCorrection() {
    if (!cls || !section || !examId || !subjectName) return;
    const reason = window.prompt('Why are these marks being sent back for correction?');
    if (!reason?.trim()) return;
    try {
      const result = await requestCorrection({ examId, class: cls, section, subjectName, reason: reason.trim() });
      toast.success('Sent back for correction', { description: `${result.updated} record(s) returned to the teacher` });
    } catch (err) {
      toast.error('Could not send back', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    }
  }

  async function handlePublish() {
    if (!cls || !section || !examId || !subjectName) return;
    try {
      const result = await publishMarks({ examId, class: cls, section, subjectName });
      toast.success('Marks published', { description: `${result.updated} record(s) published` });
    } catch (err) {
      toast.error('Could not publish', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    }
  }

  async function handleLock() {
    if (!cls || !section || !examId || !subjectName) return;
    if (!window.confirm('Lock these marks? Once locked, they can only be edited again after a principal reopens them.')) return;
    try {
      const result = await lockMarks({ examId, class: cls, section, subjectName });
      toast.success('Marks locked', { description: `${result.updated} record(s) locked` });
    } catch (err) {
      toast.error('Could not lock', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    }
  }

  async function handleReopen() {
    if (!cls || !section || !examId || !subjectName) return;
    const reason = window.prompt('Why are these marks being reopened?');
    if (!reason?.trim()) return;
    try {
      const result = await reopenMarks({ examId, class: cls, section, subjectName, reason: reason.trim() });
      toast.success('Marks reopened', { description: `${result.updated} record(s) reopened for editing` });
    } catch (err) {
      toast.error('Could not reopen', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
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
          <button type="button" onClick={() => navigate(`${basePath}/marks`)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
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
            onClick={() => setShowAiModal(true)}
            disabled={!table || editableRows.length === 0}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 disabled:opacity-40 flex items-center gap-1.5 shrink-0 transition-colors"
            title="Fill marks from a photo or voice note"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Fill
          </button>
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
            <KpiPill label="Completed" value={localCompleted} tone="ok" />
            <KpiPill label="Pending" value={localPending} tone={localPending > 0 ? 'warn' : undefined} />
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
          {someLocked && !isPrincipalOrAdmin && (
            <div className="mx-4 mt-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-500 dark:text-white/40 shrink-0" />
              <p className="text-sm font-semibold text-gray-600 dark:text-white/60">
                These marks are locked — ask your principal to reopen them to edit.
              </p>
            </div>
          )}

          {isPrincipalOrAdmin && summary && (summary.submitted + summary.approved + summary.published + summary.locked) > 0 && (
            <div className="mx-4 mt-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wide mb-3">Review Actions</p>
              <div className="flex flex-wrap gap-2">
                {summary.submitted > 0 && (
                  <>
                    <button type="button" onClick={handleApprove} disabled={isApproving} className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve ({summary.submitted})
                    </button>
                    <button type="button" onClick={handleRequestCorrection} disabled={isRequestingCorrection} className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors">
                      {isRequestingCorrection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Request Correction
                    </button>
                  </>
                )}
                {summary.approved > 0 && (
                  <button type="button" onClick={handlePublish} disabled={isPublishing} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Publish ({summary.approved})
                  </button>
                )}
                {summary.published > 0 && (
                  <button type="button" onClick={handleLock} disabled={isLocking} className="h-9 px-3 rounded-xl bg-gray-700 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    {isLocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Lock ({summary.published})
                  </button>
                )}
                {(summary.published > 0 || summary.locked > 0) && (
                  <button type="button" onClick={handleReopen} disabled={isReopening} className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors">
                    {isReopening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Reopen
                  </button>
                )}
              </div>
            </div>
          )}
          {!someLocked && otherOwnedCount > 0 && (
            <div className="mx-4 mt-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-500 dark:text-white/40 shrink-0" />
              <p className="text-sm font-semibold text-gray-600 dark:text-white/60">
                {otherOwnedCount} student{otherOwnedCount === 1 ? '' : 's'} already {otherOwnedCount === 1 ? 'has' : 'have'} marks entered by another teacher — shown read-only below.
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
                  editable={canEditRow(row)}
                  lockedByOther={rowIsLockedByOther(row, user?.userId, user?.role)}
                  aiFilled={aiFilledIds.has(row.studentId)}
                  onChangeScore={handleChangeScore}
                  onChangeStatus={handleChangeStatus}
                />
              ))
            )}
          </div>

          {editableRows.length > 0 && (
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
                  title={
                    unfilledCount > 0 ? `${unfilledCount} student(s) have missing marks`
                    : hasInvalid ? 'Fix invalid marks first'
                    : dirty ? 'Save your changes first'
                    : !allEditable ? 'Some students are already submitted/approved — use Review Actions above, or ask to reopen'
                    : undefined
                  }
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

      {showAiModal && cls && section && subjectName && examId && (
        <AiCaptureModal
          target={{ examId, class: cls, section, subjectName }}
          onApply={handleApplyExtraction}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  );
}

// ── Compound (skill-split) subject page ─────────────────────────────────────
// Same student roster, but each skill (e.g. "English - Literature") is its
// own independent Marks record under the hood, entered and workflowed
// exactly like any normal subject (see marks.service.ts's resolveBaseSubject
// for how teacher-authorization still keys off the base timetable subject).
// This page just fans the same entry-table/bulk-save/submit calls out across
// every configured skill and renders them grouped, one row per student.

interface SkillRowState {
  componentScores: ComponentScore[];
  workflowStatus: MarksWorkflowStatus | null;
  total?: number;
  percentage?: number;
  enteredById?: string;
  enteredByName?: string;
  enteredByRole?: string;
}

interface CompoundRowState {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  bySkill: Record<string, SkillRowState>;
}

function defaultComponentScores(exam: Exam): ComponentScore[] {
  return exam.components.map((c) => ({ componentName: c.name, status: 'present' as ComponentStatus }));
}

function skillRowIsEditable(status: MarksWorkflowStatus | null, role?: string): boolean {
  return rowIsEditable(status, role);
}

function skillRowCanEditByUser(row: SkillRowState, currentUserId: string | undefined, role: string | undefined): boolean {
  return skillRowIsEditable(row.workflowStatus, role)
    && !(role === 'teacher' && !!row.enteredById && row.enteredById !== currentUserId && row.enteredByRole === 'teacher');
}

function skillRowIsComplete(row: SkillRowState, maxByName: Map<string, number>): boolean {
  return row.componentScores.every((cs) => {
    if (cs.status !== 'present') return true;
    if (typeof cs.score !== 'number') return false;
    const max = maxByName.get(cs.componentName) ?? 0;
    return cs.score >= 0 && cs.score <= max;
  });
}

function skillRowIsUntouched(row: SkillRowState): boolean {
  return row.componentScores.every((cs) => cs.status === 'present' && typeof cs.score !== 'number');
}

function CompoundMarksEntryPage({ cls, section, subjectName, examId, skills, exam }: {
  cls: string; section: string; subjectName: string; examId: string; skills: string[]; exam: Exam;
}) {
  const navigate = useNavigate();
  const basePath = useLocation().pathname.split('/marks/')[0] || '/teacher';
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const skillTargets = useMemo(
    () => skills.map((skill) => ({ skill, subjectName: `${subjectName} - ${skill}`, target: { examId, class: cls, section, subjectName: `${subjectName} - ${skill}` } as MarksBatchTarget })),
    [skills, subjectName, examId, cls, section],
  );

  const tableQueries = useQueries({
    queries: skillTargets.map(({ target }) => ({
      queryKey: marksKeys.entryTable(target),
      queryFn: () => marksApi.getEntryTable(target),
    })),
  });
  const summaryQueries = useQueries({
    queries: skillTargets.map(({ target }) => ({
      queryKey: marksKeys.summary(target),
      queryFn: () => marksApi.getSummary(target),
    })),
  });

  const isLoading = tableQueries.some((q) => q.isLoading);
  const isError = tableQueries.some((q) => q.isError);
  const tables = tableQueries.map((q) => q.data);

  const [rows, setRows] = useState<CompoundRowState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tables.some((t) => !t)) return;
    const first = tables[0] as MarksEntryTable;
    setRows(
      first.rows.map((r): CompoundRowState => ({
        studentId: r.studentId,
        fullName: r.fullName,
        rollNumber: r.rollNumber,
        bySkill: Object.fromEntries(
          skillTargets.map(({ skill }, i) => {
            const t = tables[i] as MarksEntryTable;
            const existing = t.rows.find((row) => row.studentId === r.studentId)?.marks;
            const state: SkillRowState = {
              componentScores: existing?.componentScores.length ? existing.componentScores : defaultComponentScores(exam),
              workflowStatus: existing?.workflowStatus ?? null,
              total: existing?.total,
              percentage: existing?.percentage,
              enteredById: existing?.enteredById,
              enteredByName: existing?.enteredByName,
              enteredByRole: existing?.enteredByRole,
            };
            return [skill, state];
          }),
        ),
      })),
    );
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableQueries.map((q) => q.dataUpdatedAt).join(',')]);

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

  const maxByComponentName = useMemo(() => new Map(exam.components.map((c) => [c.name, c.maxMarks])), [exam]);

  function handleChangeScore(studentId: string, skill: string, componentName: string, score: number | undefined) {
    setRows((prev) => prev.map((r) => {
      if (r.studentId !== studentId) return r;
      const skillRow = r.bySkill[skill];
      return {
        ...r,
        bySkill: {
          ...r.bySkill,
          [skill]: { ...skillRow, componentScores: skillRow.componentScores.map((cs) => (cs.componentName === componentName ? { ...cs, score } : cs)) },
        },
      };
    }));
    setDirty(true);
  }

  function handleChangeStatus(studentId: string, skill: string, status: ComponentStatus) {
    setRows((prev) => prev.map((r) => {
      if (r.studentId !== studentId) return r;
      const skillRow = r.bySkill[skill];
      return {
        ...r,
        bySkill: { ...r.bySkill, [skill]: { ...skillRow, componentScores: skillRow.componentScores.map((cs) => ({ ...cs, status })) } },
      };
    }));
    setDirty(true);
  }

  const isPrincipalOrAdmin = user?.role === 'principal' || user?.role === 'admin';
  const allSkillsEditableFor = (r: CompoundRowState) => skills.every((s) => skillRowIsEditable(r.bySkill[s]?.workflowStatus ?? null, user?.role));
  const allEditable = rows.length > 0 && rows.every(allSkillsEditableFor);
  const someLocked = rows.length > 0 && rows.every((r) => skills.every((s) => !skillRowIsEditable(r.bySkill[s]?.workflowStatus ?? null, user?.role)));

  const isRowComplete = (r: CompoundRowState) => skills.every((s) => skillRowIsComplete(r.bySkill[s], maxByComponentName));
  const isRowUntouched = (r: CompoundRowState) => skills.every((s) => skillRowIsUntouched(r.bySkill[s]));
  const unfilledCount = rows.filter((r) => !isRowComplete(r)).length;
  const hasInvalid = rows.some((r) => !isRowUntouched(r) && !isRowComplete(r));
  const totalStudents = tableQueries[0]?.data?.rows.length ?? rows.length;
  const localCompleted = rows.length - unfilledCount;

  async function handleSaveDraft() {
    setIsSaving(true);
    try {
      let savedAny = false;
      for (const { skill, subjectName: skillSubject } of skillTargets) {
        const ready = rows.filter((r) => skillRowCanEditByUser(r.bySkill[skill], user?.userId, user?.role) && skillRowIsComplete(r.bySkill[skill], maxByComponentName) && !skillRowIsUntouched(r.bySkill[skill]));
        if (ready.length === 0) continue;
        savedAny = true;
        await marksApi.bulkUpsert({
          examId, class: cls, section, subjectName: skillSubject,
          records: ready.map((r) => ({ studentId: r.studentId, componentScores: r.bySkill[skill].componentScores })),
        });
      }
      if (!savedAny) {
        toast.error('Nothing to save yet', { description: 'Enter at least one student’s marks first.' });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: marksKeys.all });
      setDirty(false);
      toast.success('Draft saved', { description: `Marks saved across ${skills.length} skills` });
    } catch (err) {
      toast.error('Could not save marks', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (dirty) { toast.error('Save your changes before submitting'); return; }
    setIsSubmitting(true);
    try {
      let updated = 0;
      for (const { subjectName: skillSubject } of skillTargets) {
        const result = await marksApi.submitForReview({ examId, class: cls, section, subjectName: skillSubject });
        updated += result.updated;
      }
      await queryClient.invalidateQueries({ queryKey: marksKeys.all });
      toast.success('Submitted for review', { description: `${updated} record(s) sent to your admin/principal` });
    } catch (err) {
      toast.error('Could not submit', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitDisabled = isSubmitting || dirty || hasInvalid || unfilledCount === rows.length || rows.length === 0 || !allEditable;

  const [isReviewActionPending, setIsReviewActionPending] = useState(false);
  const aggregateSummary = summaryQueries.reduce(
    (acc, q) => {
      const s = q.data;
      if (!s) return acc;
      return {
        submitted: acc.submitted + s.submitted, approved: acc.approved + s.approved,
        published: acc.published + s.published, locked: acc.locked + s.locked,
      };
    },
    { submitted: 0, approved: 0, published: 0, locked: 0 },
  );

  async function runReviewAction(
    action: (target: MarksBatchTarget) => Promise<{ updated: number }>,
    successMessage: string,
  ) {
    setIsReviewActionPending(true);
    try {
      let updated = 0;
      for (const { subjectName: skillSubject } of skillTargets) {
        const result = await action({ examId, class: cls, section, subjectName: skillSubject });
        updated += result.updated;
      }
      await queryClient.invalidateQueries({ queryKey: marksKeys.all });
      toast.success(successMessage, { description: `${updated} record(s) updated` });
    } catch (err) {
      toast.error('Action failed', { description: err instanceof Error ? err.message : 'Check your connection and try again.' });
    } finally {
      setIsReviewActionPending(false);
    }
  }

  const handleApprove = () => runReviewAction((t) => marksApi.approve(t), 'Marks approved');
  const handlePublish = () => runReviewAction((t) => marksApi.publish(t), 'Marks published');
  const handleLock = () => {
    if (!window.confirm('Lock these marks? Once locked, they can only be edited again after a principal reopens them.')) return;
    return runReviewAction((t) => marksApi.lock(t), 'Marks locked');
  };
  const handleRequestCorrection = () => {
    const reason = window.prompt('Why are these marks being sent back for correction?');
    if (!reason?.trim()) return;
    return runReviewAction((t) => marksApi.requestCorrection({ ...t, reason: reason.trim() }), 'Sent back for correction');
  };
  const handleReopen = () => {
    const reason = window.prompt('Why are these marks being reopened?');
    if (!reason?.trim()) return;
    return runReviewAction((t) => marksApi.reopen({ ...t, reason: reason.trim() }), 'Marks reopened');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0518] flex flex-col">
      <div className="bg-white dark:bg-[#0F0821] border-b border-gray-100 dark:border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(`${basePath}/marks`)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
              Class {cls} – {section} · {subjectName}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                <ListTree className="w-3 h-3" /> {skills.length} skills
              </span>
            </h1>
            <p className="text-xs text-gray-400 dark:text-white/40 truncate">{exam.name} · {skills.join(', ')}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <KpiPill label="Total" value={totalStudents} />
          <KpiPill label="Completed" value={localCompleted} tone="ok" />
          <KpiPill label="Pending" value={unfilledCount} tone={unfilledCount > 0 ? 'warn' : undefined} />
        </div>
      </div>

      {isLoading ? (
        <div className="mx-4 mt-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : isError ? (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Couldn't load marks for one or more skills</p>
        </div>
      ) : (
        <>
          {someLocked && !isPrincipalOrAdmin && (
            <div className="mx-4 mt-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-500 dark:text-white/40 shrink-0" />
              <p className="text-sm font-semibold text-gray-600 dark:text-white/60">
                These marks are locked — ask your principal to reopen them to edit.
              </p>
            </div>
          )}

          {isPrincipalOrAdmin && (aggregateSummary.submitted + aggregateSummary.approved + aggregateSummary.published + aggregateSummary.locked) > 0 && (
            <div className="mx-4 mt-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wide mb-3">Review Actions (all skills)</p>
              <div className="flex flex-wrap gap-2">
                {aggregateSummary.submitted > 0 && (
                  <>
                    <button type="button" onClick={handleApprove} disabled={isReviewActionPending} className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve ({aggregateSummary.submitted})
                    </button>
                    <button type="button" onClick={handleRequestCorrection} disabled={isReviewActionPending} className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors">
                      <Undo2 className="w-3.5 h-3.5" /> Request Correction
                    </button>
                  </>
                )}
                {aggregateSummary.approved > 0 && (
                  <button type="button" onClick={handlePublish} disabled={isReviewActionPending} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    <Send className="w-3.5 h-3.5" /> Publish ({aggregateSummary.approved})
                  </button>
                )}
                {aggregateSummary.published > 0 && (
                  <button type="button" onClick={handleLock} disabled={isReviewActionPending} className="h-9 px-3 rounded-xl bg-gray-700 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    <Lock className="w-3.5 h-3.5" /> Lock ({aggregateSummary.published})
                  </button>
                )}
                {(aggregateSummary.published > 0 || aggregateSummary.locked > 0) && (
                  <button type="button" onClick={handleReopen} disabled={isReviewActionPending} className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Reopen
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mx-4 mt-4 bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent shadow-sm overflow-hidden">
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-white/50">No active students in this class</p>
              </div>
            ) : (
              rows.map((row, i) => {
                const color = avatarColorFor(row.studentId);
                const initials = row.fullName.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
                return (
                  <div key={row.studentId} className="px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="text-xs text-gray-400 dark:text-white/30 w-6 text-right shrink-0 font-mono tabular-nums">{i + 1}</span>
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', color.bg)}>
                        <span className={cn('text-[10px] font-bold', color.text)}>{initials}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.fullName}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 pl-9">
                      {skills.map((skill) => {
                        const skillRow = row.bySkill[skill];
                        const canEdit = skillRowCanEditByUser(skillRow, user?.userId, user?.role);
                        const lockedByOther = !!skillRow.enteredById && user?.role === 'teacher' && skillRow.enteredById !== user?.userId && skillRow.enteredByRole === 'teacher';
                        const status = skillRow.componentScores[0]?.status ?? 'present';
                        const isPresent = status === 'present';
                        return (
                          <div key={skill} className="rounded-xl border border-gray-100 dark:border-white/10 px-2.5 py-2 flex flex-col gap-1.5 min-w-[140px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase tracking-wide">{skill}</span>
                              {skillRow.workflowStatus && (
                                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', WORKFLOW_BADGE[skillRow.workflowStatus].className)}>
                                  {WORKFLOW_BADGE[skillRow.workflowStatus].label}
                                </span>
                              )}
                            </div>
                            {skillRow.enteredByName && (
                              <p className="text-[9px] text-gray-400 dark:text-white/30 truncate flex items-center gap-1">
                                {lockedByOther && <Lock className="w-2.5 h-2.5 shrink-0" />}
                                {skillRow.enteredByName}
                              </p>
                            )}
                            <select
                              value={status}
                              disabled={!canEdit}
                              onChange={(e) => handleChangeStatus(row.studentId, skill, e.target.value as ComponentStatus)}
                              className="text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-white/70 px-1.5 py-1 disabled:opacity-50"
                            >
                              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            {isPresent && (
                              <div className="flex flex-wrap gap-1.5">
                                {exam.components.map((c) => {
                                  const cs = skillRow.componentScores.find((s) => s.componentName === c.name);
                                  const value = cs?.score;
                                  const invalid = typeof value === 'number' && (value < 0 || value > c.maxMarks);
                                  return (
                                    <label key={c.name} className="flex flex-col gap-0.5">
                                      {exam.components.length > 1 && (
                                        <span className="text-[9px] font-semibold text-gray-400 dark:text-white/30">{c.name} /{c.maxMarks}</span>
                                      )}
                                      <input
                                        type="number" inputMode="decimal" min={0} max={c.maxMarks}
                                        value={value ?? ''}
                                        disabled={!canEdit}
                                        onChange={(e) => handleChangeScore(row.studentId, skill, c.name, e.target.value === '' ? undefined : Number(e.target.value))}
                                        placeholder={`/${c.maxMarks}`}
                                        className={cn(
                                          // text-base (16px) avoids iOS Safari's auto-zoom-on-focus for small inputs.
                                          'w-[4.5rem] h-9 px-2 rounded-lg border text-base tabular-nums text-gray-900 dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 disabled:opacity-50',
                                          invalid ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 dark:border-white/10 focus:ring-[#A855F7]/30',
                                        )}
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!someLocked && rows.length > 0 && (
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
                  title={
                    unfilledCount > 0 ? `${unfilledCount} student(s) have missing marks`
                    : hasInvalid ? 'Fix invalid marks first'
                    : dirty ? 'Save your changes first'
                    : !allEditable ? 'Some students are already submitted/approved — use Review Actions above, or ask to reopen'
                    : undefined
                  }
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:from-violet-700 hover:to-pink-600 disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for Review
                </button>
              </div>
            </>
          )}

          {!allEditable && rows.length > 0 && summaryQueries.every((q) => q.data) && (
            (() => {
              const allPublishedOrLocked = summaryQueries.every((q) => {
                const s = q.data!;
                return s.published + s.locked === totalStudents;
              });
              return allPublishedOrLocked ? (
                <div className="mx-4 mt-4 mb-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">All marks published for this exam.</p>
                </div>
              ) : null;
            })()
          )}
        </>
      )}
    </div>
  );
}
