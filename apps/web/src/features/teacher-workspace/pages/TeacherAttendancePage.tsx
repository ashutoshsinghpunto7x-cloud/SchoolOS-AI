import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Pencil,
  CalendarDays,
  Phone,
  GripVertical,
  Search,
  X,
  Check,
  Undo2,
} from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, useAnimationControls, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { useClassAttendance, useBulkMarkAttendance } from '@/features/attendance/hooks/useAttendance';
import { useInvalidateTeacherWorkspace } from '../hooks/useTeacherWorkspace';
// WhatsApp absent-notification sending is temporarily disabled — see AbsenteeOutreach
// below. Re-import when re-enabling: `import { useAbsenteeReminder } from '../hooks/useAbsenteeReminder';`
import { useState, useEffect, useRef } from 'react';
import type { AttendanceStatus, Student } from '@schoolos/types';
import { cn } from '@/lib/utils';
import { avatarColorFor } from '../utils/avatarColor';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSmartDraft } from '@/hooks/useSmartDraft';
import { buildDraftKey } from '@/lib/drafts/buildDraftKey';
import { RecoveryBanner } from '@/components/drafts/RecoveryBanner';
import { OfflineBanner } from '@/components/drafts/OfflineBanner';
import { DraftStatusIndicator } from '@/components/drafts/DraftStatusIndicator';

// ── Numeric counter tween — animates a number smoothly instead of snapping ────

function useAnimatedCounter(target: number) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    if (from === target) return;
    prevRef.current = target;
    const controls = animate(from, target, {
      duration: 0.4,
      ease: [0.33, 1, 0.68, 1], // easeOutCubic
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [target]);

  return display;
}

// ── Present/Absent summary cards — premium "3D" badge + animated count + burst ─

function SummaryCard({
  type,
  count,
  burstToken,
  cardRef,
}: {
  type: 'present' | 'absent';
  count: number;
  /** Increments each time this status is marked — a change re-fires the particle burst. */
  burstToken: number;
  cardRef: React.RefObject<HTMLDivElement>;
}) {
  const displayCount = useAnimatedCounter(count);
  const controls = useAnimationControls();
  const [particles, setParticles] = useState<{ id: number; angle: number; dist: number }[]>([]);
  const particleIdRef = useRef(0);
  const isPresent = type === 'present';
  // Briefly rings the card when a "+1" flyer lands on it — mirrors the
  // "counter box highlights" beat from the reference design.
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (burstToken === 0) return;
    // Kept small on purpose — the dark-theme glass card has a backdrop-blur
    // that resamples on every scale change, so the same pulse reads as a much
    // bigger "zoom" there than on the flat white card in light mode.
    void controls.start({ scale: [1, 1.02, 1] }, { duration: 0.4, ease: [0.33, 1, 0.68, 1] });
    const next = Array.from({ length: 6 }, () => ({
      id: particleIdRef.current++,
      angle: Math.random() * 360,
      dist: 18 + Math.random() * 14,
    }));
    setParticles(next);
    setHighlighted(true);
    const t = setTimeout(() => setParticles([]), 320);
    const ht = setTimeout(() => setHighlighted(false), 600);
    return () => { clearTimeout(t); clearTimeout(ht); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstToken]);

  // Applied as an inline style rather than Tailwind ring/shadow utilities —
  // `.dark .teacher-glass-card` in globals.css sets its own fixed box-shadow
  // via a compound selector that outranks any single-class utility, so a
  // class-based glow silently loses the cascade in dark mode. An inline
  // style always wins regardless of theme.
  //
  // Inset, not outset: the dark card's own background is a translucent,
  // backdrop-blurred gradient (not opaque white like light mode), so an
  // outward glow reads as a halo floating outside the barely-visible card
  // edge instead of a ring hugging it. Drawing the ring inset keeps it flush
  // with the card's actual border regardless of what shows through behind it.
  const highlightShadow = highlighted
    ? isPresent
      ? '0 0 0 2px rgba(52,211,153,0.9), 0 0 18px rgba(16,185,129,0.45)'
      : '0 0 0 2px rgba(248,113,113,0.9), 0 0 18px rgba(239,68,68,0.45)'
    : undefined;

  return (
    <motion.div
      ref={cardRef}
      animate={controls}
      style={{ boxShadow: highlightShadow, transition: 'box-shadow 300ms ease' }}
      className={cn(
        // Deliberately not `teacher-glass-card` here — its translucent,
        // backdrop-blurred fill made the highlight ring look detached from
        // the card edge in dark mode. A solid dark background keeps this
        // card's look identical to light mode, just recolored.
        'relative flex-1 rounded-[22px] p-4 flex items-center gap-3 border overflow-hidden bg-white dark:bg-[#150C29] shadow-sm',
        isPresent ? 'border-emerald-100 dark:border-emerald-500/20' : 'border-red-100 dark:border-red-500/20',
      )}
    >
      {/* Particle burst */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className={cn(
              'absolute left-9 top-1/2 w-1.5 h-1.5 rounded-full pointer-events-none',
              isPresent ? 'bg-emerald-400' : 'bg-red-400',
            )}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((p.angle * Math.PI) / 180) * p.dist,
              y: Math.sin((p.angle * Math.PI) / 180) * p.dist,
              opacity: 0,
              scale: 0.4,
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* "3D" icon badge — gradient sphere + inner highlight to fake dimensionality */}
      <div
        className={cn(
          'relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
          isPresent ? 'bg-gradient-to-br from-emerald-300 to-emerald-600' : 'bg-gradient-to-br from-red-300 to-red-600',
        )}
        style={{
          boxShadow: isPresent
            ? '0 4px 14px rgba(16,185,129,0.4), inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.15)'
            : '0 4px 14px rgba(239,68,68,0.4), inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.15)',
        }}
      >
        {isPresent ? (
          <Check className="w-6 h-6 text-white drop-shadow" strokeWidth={3} />
        ) : (
          <X className="w-6 h-6 text-white drop-shadow" strokeWidth={3} />
        )}
      </div>

      <div>
        <p className={cn(
          'text-2xl font-extrabold tabular-nums leading-none',
          isPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
        )}>
          {displayCount}
        </p>
        <p className="text-xs font-semibold text-gray-400 dark:text-white/40 mt-1">
          {isPresent ? 'Present' : 'Absent'}
        </p>
      </div>
    </motion.div>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// ── Row types ─────────────────────────────────────────────────────────────────

type RowStatus = 'present' | 'absent' | 'unmarked';

interface Row {
  studentId:  string;
  fullName:   string;
  rollNumber?: string;
  photoUrl?: string;
  status:     RowStatus;
  /** Set the moment a row is marked present/absent — lets the list push marked
   *  rows to the bottom in the order they were marked, so the swipe queue at
   *  top always shows who's left, and a mis-tap is easy to find and fix. */
  markedSeq?: number;
}

/** Ascending roll-number sort — numeric when possible, falling back to a plain string compare for non-numeric rolls. */
function compareRollNumber(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// ── Active (swipeable) card ───────────────────────────────────────────────────

function StudentAvatar({ studentId, fullName, photoUrl, size = 'md' }: { studentId: string; fullName: string; photoUrl?: string; size?: 'sm' | 'md' }) {
  const initials = fullName.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const color = avatarColorFor(studentId);
  return (
    <div className={cn(dim, color.bg, 'rounded-full flex items-center justify-center shrink-0 overflow-hidden')}>
      {photoUrl ? (
        <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className={cn('font-bold', color.text, size === 'sm' ? 'text-[10px]' : 'text-xs')}>{initials}</span>
      )}
    </div>
  );
}

function ActiveCard({
  row,
  onMark,
}: {
  row:     Row;
  onMark:  (id: string, status: RowStatus, originRect?: DOMRect) => void;
}) {
  const x = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // Colored reveal panels behind the draggable card — green/PRESENT peeks in
  // from the left as the card is dragged right, red/ABSENT peeks in from the
  // right as it's dragged left.
  const presentOpacity = useTransform(x, [0, 40, 90], [0, 0.7, 1], { clamp: true });
  const absentOpacity  = useTransform(x, [-90, -40, 0], [1, 0.7, 0], { clamp: true });

  function handleDragEnd(_e: unknown, info: { offset: { x: number } }) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (info.offset.x > 90) onMark(row.studentId, 'present', rect);
    else if (info.offset.x < -90) onMark(row.studentId, 'absent', rect);
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm">
      {/* Reveal panels */}
      <motion.div
        style={{ opacity: presentOpacity }}
        className="absolute inset-0 bg-emerald-500 flex items-center gap-2 px-5"
      >
        <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
        <span className="text-sm font-bold text-white tracking-wide">PRESENT</span>
      </motion.div>
      <motion.div
        style={{ opacity: absentOpacity }}
        className="absolute inset-0 bg-red-500 flex items-center justify-end gap-2 px-5"
      >
        <span className="text-sm font-bold text-white tracking-wide">ABSENT</span>
        <X className="w-5 h-5 text-white" strokeWidth={2.5} />
      </motion.div>

      {/* Draggable foreground card */}
      <motion.div
        ref={cardRef}
        className="relative flex items-center gap-3 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-200 dark:border-white/10 px-4 py-4 cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
      >
        <StudentAvatar studentId={row.studentId} fullName={row.fullName} photoUrl={row.photoUrl} />
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900 dark:text-white truncate">{row.fullName}</p>
          {row.rollNumber && (
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">Roll No: {row.rollNumber}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <GripVertical className="w-4 h-4 text-gray-300 dark:text-white/20" />
          <span className="text-[9px] font-bold text-gray-400 dark:text-white/30 tracking-wide">SWIPE TO MARK</span>
        </div>
      </motion.div>
    </div>
  );
}

// ── Compact row (marked or awaiting turn) ─────────────────────────────────────

function CompactRow({
  row,
  index,
  editable,
  onUndo,
  onMark,
  glowStatus,
}: {
  row:      Row;
  index:    number;
  editable: boolean;
  onUndo:   (id: string) => void;
  /** When provided (swipe mode is off, or the list is being searched), unmarked rows get tap-to-mark buttons instead of just a placeholder dot. */
  onMark?:  (id: string, status: RowStatus, originRect?: DOMRect) => void;
  /** Set for ~350ms right after this row gets marked — briefly glows green/red. */
  glowStatus?: 'present' | 'absent' | null;
}) {
  const marked = row.status !== 'unmarked';

  return (
    <div
      className={cn(
        'w-full flex items-center px-4 py-3 gap-3 transition-colors duration-300',
        marked && 'bg-gray-50/60 dark:bg-white/[0.03]',
        glowStatus === 'present' && 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-inset ring-emerald-300 dark:ring-emerald-400/40 shadow-[0_0_16px_rgba(16,185,129,0.35)]',
        glowStatus === 'absent' && 'bg-red-50 dark:bg-red-500/10 ring-1 ring-inset ring-red-300 dark:ring-red-400/40 shadow-[0_0_16px_rgba(239,68,68,0.35)]',
      )}
    >
      <button
        type="button"
        disabled={!marked || !editable}
        onClick={() => onUndo(row.studentId)}
        className={cn(
          'flex-1 flex items-center gap-3 text-left min-w-0',
          marked && editable && 'hover:brightness-[0.97]',
          !marked && 'cursor-default',
        )}
      >
        <span className="text-sm text-gray-400 dark:text-white/30 w-6 text-right shrink-0 font-mono">{index + 1}</span>
        <StudentAvatar studentId={row.studentId} fullName={row.fullName} photoUrl={row.photoUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.fullName}</p>
          {row.rollNumber && <p className="text-[11px] text-gray-400 dark:text-white/30">Roll No: {row.rollNumber}</p>}
        </div>
      </button>

      {marked ? (
        <span className={cn('text-xs font-bold shrink-0', row.status === 'present' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
          {row.status === 'present' ? 'Present' : 'Absent'}
        </span>
      ) : editable && onMark ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => onMark(row.studentId, 'present', e.currentTarget.getBoundingClientRect())}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
            title="Mark present"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => onMark(row.studentId, 'absent', e.currentTarget.getBoundingClientRect())}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors"
            title="Mark absent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <span className="w-2 h-2 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-50 dark:border-white/5 gap-3 animate-pulse">
      <div className="w-6 h-4 bg-gray-100 dark:bg-white/10 rounded shrink-0" />
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 dark:bg-white/10 rounded w-32" />
      </div>
    </div>
  );
}

// ── Absentee outreach (call now; WhatsApp reminder disabled for now) ──────────
//
// The WhatsApp "send reminder" feature is intentionally disabled below — just
// the absent students' names + a call-parent shortcut are shown. To re-enable
// WhatsApp sending later: restore the commented-out state/handler/JSX further
// down, and re-add `import { useAbsenteeReminder } from '../hooks/useAbsenteeReminder';`
// at the top of this file.

interface Absentee {
  studentId: string;
  fullName: string;
  parentPhone?: string;
}

// const defaultReminderTemplate = (date: string) =>
//   `Hi, this is to inform you that {name} was marked absent today, ${formatDisplayDate(date)}. Please contact the school if this is unexpected.`;

const telHref = (phone?: string) => {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `tel:+91${digits}` : `tel:${digits}`;
};

function AbsenteeOutreach({ absentees, date }: { absentees: Absentee[]; date: string }) {
  // const [selected, setSelected] = useState<Set<string>>(new Set(absentees.map((a) => a.studentId)));
  // const [template, setTemplate] = useState(defaultReminderTemplate(date));
  // const { sendReminders, isSending, sentCount, failedCount } = useAbsenteeReminder();
  // const [done, setDone] = useState(false);
  //
  // function toggle(studentId: string) {
  //   setSelected((prev) => {
  //     const next = new Set(prev);
  //     if (next.has(studentId)) next.delete(studentId);
  //     else next.add(studentId);
  //     return next;
  //   });
  // }
  //
  // async function handleSend() {
  //   const targets = absentees.filter((a) => selected.has(a.studentId));
  //   if (!targets.length) return;
  //   setDone(false);
  //   await sendReminders(
  //     targets.map((t) => ({ studentId: t.studentId, studentName: t.fullName })),
  //     (name) => template.replace('{name}', name),
  //   );
  //   setDone(true);
  // }

  return (
    <div className="w-full max-w-sm mt-6 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5 text-left">
      <p className="font-bold text-gray-900 dark:text-white">Absent Today ({absentees.length})</p>
      <p className="text-xs text-gray-400 dark:text-white/40 mb-3">{formatDisplayDate(date)}</p>

      <div className="space-y-2">
        {absentees.map((a) => {
          const href = telHref(a.parentPhone);
          return (
            <div key={a.studentId} className="flex items-center gap-3 py-1.5">
              <p className="flex-1 min-w-0 text-sm font-semibold text-gray-800 dark:text-white/80 truncate">{a.fullName}</p>
              {href ? (
                <a
                  href={href}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors shrink-0"
                  title="Call parent"
                >
                  <Phone className="w-4 h-4" />
                </a>
              ) : (
                <span className="text-xs text-gray-300 dark:text-white/20 shrink-0">No phone</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── WhatsApp reminder — disabled for now, restore when ready ──────────
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 mt-4">WhatsApp reminder message</label>
      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 mb-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
      />
      <p className="text-[11px] text-gray-400 mb-3">Use <span className="font-mono">{'{name}'}</span> to insert each student's name.</p>

      {done && (
        <div className="text-xs font-medium mb-3 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">
          Sent to {sentCount} parent{sentCount !== 1 ? 's' : ''}{failedCount > 0 ? ` · ${failedCount} failed` : ''}
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={isSending || selected.size === 0}
        className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
      >
        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
        {isSending ? `Sending… (${sentCount}/${selected.size})` : `Send WhatsApp Reminder (${selected.size})`}
      </button>
      ── */}
    </div>
  );
}

// ── Success (Submitted) screen ────────────────────────────────────────────────

function SubmittedScreen({
  cls,
  section,
  date,
  presentCount,
  absentCount,
  absentees,
  onEdit,
  onViewStudents,
  onDashboard,
}: {
  cls:          string;
  section:      string;
  date:         string;
  presentCount: number;
  absentCount:  number;
  absentees:    Absentee[];
  onEdit:       () => void;
  onViewStudents: () => void;
  onDashboard:  () => void;
}) {
  const submitTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0518] flex flex-col items-center justify-center px-6 py-10 text-center">
      {/* Animated check */}
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-500/20 animate-ping opacity-30" />
        <div className="relative w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance submitted</h2>
      <p className="text-gray-500 dark:text-white/50 mt-1">successfully!</p>

      {/* Class summary card */}
      <div className="w-full max-w-sm mt-8 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5 text-left">
        <p className="font-bold text-gray-900 dark:text-white">
          Class {cls}{section ? ` – ${section}` : ''}
        </p>
        <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">{formatDisplayDate(date)}</p>
        <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{submitTime}</p>

        <div className="flex gap-6 mt-5">
          <div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{presentCount}</p>
            <p className="text-xs text-gray-400 dark:text-white/40 font-medium mt-0.5">Present</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">{absentCount}</p>
            <p className="text-xs text-gray-400 dark:text-white/40 font-medium mt-0.5">Absent</p>
          </div>
        </div>
      </div>

      {absentees.length > 0 && <AbsenteeOutreach absentees={absentees} date={date} />}

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-8 w-full max-w-sm">
        <button
          onClick={onViewStudents}
          className="h-12 bg-[#5B21B6] text-white font-semibold rounded-xl text-sm hover:bg-[#4C1D95] transition-colors"
        >
          View Students
        </button>
        <button
          onClick={onEdit}
          className="h-12 bg-white dark:bg-[#150C29] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Edit Attendance
        </button>
        <button
          onClick={onDashboard}
          className="text-sm text-[#5B21B6] dark:text-violet-300 font-semibold py-1 hover:underline transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TeacherAttendancePage() {
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const navigate = useNavigate();
  const invalidateWorkspace = useInvalidateTeacherWorkspace();

  const today = toDateStr(new Date());
  const [date,      setDate]      = useState(today);
  const [rows,      setRows]      = useState<Row[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [swipeMode,   setSwipeMode]   = useState(true);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // A stack (not a single slot) so the teacher can undo several marks in a row
  // instead of the Undo button disappearing after just one.
  const [undoStack, setUndoStack] = useState<{ studentId: string; prevStatus: RowStatus }[]>([]);
  const markCounterRef = useRef(0);
  // Tracks swipes made since the page loaded / since the last successful save —
  // a teacher swiping through a class on their phone is exactly who's likely to
  // hit an accidental back-gesture and lose everything with no warning.
  const [dirty,     setDirty]     = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // ── Smart draft (client-side autosave + crash recovery) ───────────────────
  const { user } = useAuth();
  const draftKey = user && cls && section
    ? buildDraftKey({ schoolId: user.schoolId, teacherId: user.userId, module: 'attendance', classId: cls, section, date })
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

  // ── Mark-attendance micro-interactions ────────────────────────────────────
  // Row glow: briefly highlights the just-marked row green/red as it settles
  // into the compact list.
  const [glowId, setGlowId] = useState<string | null>(null);
  const [glowStatus, setGlowStatus] = useState<'present' | 'absent' | null>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Floating "+1" that flies from the marked row toward the Present/Absent card.
  interface Flyer { id: number; status: 'present' | 'absent'; fromX: number; fromY: number; toX: number; toY: number; }
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const flyerIdRef = useRef(0);
  const presentCardRef = useRef<HTMLDivElement>(null);
  const absentCardRef  = useRef<HTMLDivElement>(null);
  // Incrementing tokens re-trigger each summary card's scale-pulse + particle burst.
  const [presentBurst, setPresentBurst] = useState(0);
  const [absentBurst,  setAbsentBurst]  = useState(0);

  function spawnFlyer(status: 'present' | 'absent', originRect?: DOMRect) {
    const targetEl = status === 'present' ? presentCardRef.current : absentCardRef.current;
    if (!originRect || !targetEl) return;
    const targetRect = targetEl.getBoundingClientRect();
    const id = ++flyerIdRef.current;
    setFlyers((prev) => [...prev, {
      id, status,
      fromX: originRect.left + originRect.width / 2,
      fromY: originRect.top + originRect.height / 2,
      toX: targetRect.left + targetRect.width / 2,
      toY: targetRect.top + targetRect.height / 2,
    }]);
    setTimeout(() => setFlyers((prev) => prev.filter((f) => f.id !== id)), 450);
  }

  // Warn before closing/refreshing the tab with unsaved swipes.
  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // Warn before in-app navigation away (sidebar links, bottom nav, browser
  // back) with unsaved swipes — the leading cause of silently lost attendance.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm(
      'You have unsaved attendance changes. Leave without saving?',
    );
    if (leave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  const { data: studentsData, isLoading: studentsLoading, isError: studentsError } = useStudentsPaginated({
    class: cls, section, limit: 300, status: 'active',
  });

  const { data: existingAttendance, isLoading: attendanceLoading, isError: attendanceError } =
    useClassAttendance(cls ?? '', section ?? '', date);

  const { mutateAsync: bulkMark, isPending } = useBulkMarkAttendance();

  const students: Student[] = studentsData?.data ?? [];

  // Populate rows when data loads — sorted ascending by roll number so the
  // swipe queue and list both follow the class register order.
  useEffect(() => {
    if (!students.length) return;
    const existMap = new Map(
      (existingAttendance ?? []).map((a) => [a.studentId, a.status as AttendanceStatus]),
    );
    const sorted = [...students].sort((a, b) => compareRollNumber(a.rollNumber, b.rollNumber));
    let seq = 0;
    setRows(
      sorted.map((s) => {
        const existing = existMap.get(s._id);
        const status: RowStatus = existing === 'present' ? 'present' : existing === 'absent' ? 'absent' : 'unmarked';
        return {
          studentId: s._id, fullName: s.fullName, rollNumber: s.rollNumber, photoUrl: s.photoUrl, status,
          markedSeq: status !== 'unmarked' ? seq++ : undefined,
        };
      }),
    );
    markCounterRef.current = seq;
    setDirty(false); // fresh sync from the server, not an unsaved user edit
  }, [students.length, existingAttendance, date]);

  const alreadySubmitted =
    !attendanceLoading && (existingAttendance ?? []).length > 0 && !editMode;

  const editable = !alreadySubmitted || editMode;

  const presentCount = rows.filter((r) => r.status === 'present').length;
  const absentCount  = rows.filter((r) => r.status === 'absent').length;
  const unmarkedCount = rows.filter((r) => r.status === 'unmarked').length;
  const activeIndex = rows.findIndex((r) => r.status === 'unmarked');
  const completionPercent = rows.length ? ((presentCount + absentCount) / rows.length) * 100 : 0;
  const isAllPresent = rows.length > 0 && rows.every((r) => r.status === 'present');
  const isSearching = searchOpen && searchQuery.trim().length > 0;
  const filteredRows = isSearching
    ? rows.filter((r) => r.fullName.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : rows;
  const useSwipeFlow = swipeMode && !isSearching;

  function markStatus(studentId: string, status: RowStatus, originRect?: DOMRect) {
    const prevStatus = rows.find((r) => r.studentId === studentId)?.status ?? 'unmarked';
    setUndoStack((prev) => [...prev, { studentId, prevStatus }]);
    setRows((prev) => prev.map((r) =>
      r.studentId === studentId ? { ...r, status, markedSeq: markCounterRef.current++ } : r,
    ));
    setDirty(true);

    if (status === 'present' || status === 'absent') {
      setGlowId(studentId);
      setGlowStatus(status);
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
      glowTimerRef.current = setTimeout(() => { setGlowId(null); setGlowStatus(null); }, 350);

      spawnFlyer(status, originRect);

      // Fire the counter's highlight/burst once the "+1" actually lands,
      // matching the fly-then-glow beat from the reference design instead of
      // pulsing the card before the flyer has even left the row.
      setTimeout(() => {
        if (status === 'present') setPresentBurst((n) => n + 1);
        else setAbsentBurst((n) => n + 1);
      }, originRect ? 420 : 0);
    }
  }

  function undoStatus(studentId: string) {
    setUndoStack((prev) => prev.filter((a) => a.studentId !== studentId));
    setRows((prev) => prev.map((r) =>
      r.studentId === studentId ? { ...r, status: 'unmarked', markedSeq: undefined } : r,
    ));
    setDirty(true);
  }

  function undoLastAction() {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const { studentId, prevStatus } = prev[prev.length - 1];
      setRows((rs) => rs.map((r) =>
        r.studentId === studentId
          ? { ...r, status: prevStatus, markedSeq: prevStatus === 'unmarked' ? undefined : r.markedSeq }
          : r,
      ));
      return prev.slice(0, -1);
    });
  }

  function toggleMarkAllPresent() {
    setRows((prev) => prev.map((r) => (
      isAllPresent
        ? { ...r, status: 'unmarked', markedSeq: undefined }
        : { ...r, status: 'present', markedSeq: markCounterRef.current++ }
    )));
    setDirty(true);
    if (!isAllPresent) setPresentBurst((n) => n + 1);
  }

  async function handleSave() {
    if (!cls || !section) return;
    try {
      await bulkMark({
        class:   cls,
        section: section,
        date,
        records: rows
          .filter((r): r is Row & { status: AttendanceStatus } => r.status !== 'unmarked')
          .map((r) => ({ studentId: r.studentId, status: r.status })),
      });
      await invalidateWorkspace();
      setSubmitted(true);
      setEditMode(false);
      setDirty(false);
      draft.markSubmitted();
    } catch (err) {
      // Without this, a dropped connection or a 403/500 would fail silently —
      // the teacher would see the button reset and could walk away believing
      // attendance was saved when it wasn't. Nothing here is marked as saved,
      // so it's always safe to just tap Save again.
      toast.error('Could not save attendance', {
        description: err instanceof Error ? err.message : 'Check your connection and try again.',
      });
    } finally {
      setShowSaveConfirm(false);
    }
  }

  const isLoading = studentsLoading || attendanceLoading;
  // Surfaced separately from "no students in this class" — without this, a
  // failed fetch (dropped connection, 500) would silently render as an empty
  // class instead of a clear, retryable error.
  const isDataError = studentsError || attendanceError;

  const studentsById = new Map(students.map((s) => [s._id, s]));
  const absentees: Absentee[] = rows
    .filter((r) => r.status === 'absent')
    .map((r) => ({
      studentId: r.studentId,
      fullName: r.fullName,
      parentPhone: studentsById.get(r.studentId)?.parentPhone,
    }));

  // ── Submitted screen ─────────────────────────────────────────────────────

  if (submitted && !editMode) {
    return (
      <SubmittedScreen
        cls={cls!}
        section={section!}
        date={date}
        presentCount={presentCount}
        absentCount={absentCount}
        absentees={absentees}
        onEdit={() => { setSubmitted(false); setEditMode(true); }}
        onViewStudents={() => navigate(`/teacher/classes/${cls}/${section}/students`)}
        onDashboard={() => navigate('/teacher')}
      />
    );
  }

  // ── Attendance screen ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0518] flex flex-col">

      {/* Floating "+1" flyers — travel from the marked row to the Present/Absent card */}
      <AnimatePresence>
        {flyers.map((f) => (
          <motion.span
            key={f.id}
            className={cn(
              'pointer-events-none fixed z-[60] left-0 top-0 font-extrabold text-lg',
              f.status === 'present' ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
            )}
            style={{ x: f.fromX, y: f.fromY, translateX: '-50%', translateY: '-50%' }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ x: f.toX, y: f.toY, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.42, ease: [0.33, 1, 0.68, 1] }}
          >
            +1
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Header — date top-left (no title, no progress ring), Undo/Edit right-aligned */}
      <div className="bg-white dark:bg-[#0F0821] border-b border-gray-100 dark:border-white/5 px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-8 h-8 -ml-1 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-gray-400 dark:text-white/40" />
          </button>

          {searchOpen ? (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student…"
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
                title="Back to date"
              >
                <CalendarDays className="w-5 h-5 text-[#5B21B6] dark:text-violet-300" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setDate((d) => addDays(d, -1))}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-400 dark:text-white/40" />
                </button>
                <div className="flex items-center gap-1.5 min-w-0">
                  <CalendarDays className="w-4 h-4 text-[#5B21B6] dark:text-violet-300 shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/80 truncate">
                    {formatDisplayDate(date)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDate((d) => addDays(d, 1))}
                  disabled={date >= today}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-white/40" />
                </button>
              </div>

              <DraftStatusIndicator status={draft.status} lastSavedAt={draft.lastSavedAt} />

              {undoStack.length > 0 && editable && (
                <button
                  type="button"
                  onClick={undoLastAction}
                  title="Undo last mark"
                  className="h-8 px-2.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 transition-colors shrink-0"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {undoStack.length > 1 ? undoStack.length : ''}
                </button>
              )}
              {alreadySubmitted && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="h-8 px-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-gray-600 dark:text-white/60 flex items-center gap-1 transition-colors shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Present / Absent summary cards */}
      {!isLoading && !isDataError && rows.length > 0 && (
        <div className="px-4 mt-4 flex items-center gap-3">
          <SummaryCard type="present" count={presentCount} burstToken={presentBurst} cardRef={presentCardRef} />
          <SummaryCard type="absent" count={absentCount} burstToken={absentBurst} cardRef={absentCardRef} />
        </div>
      )}

      {isLoading ? (
        <div className="flex-1">
          <div className="mx-4 mt-4 h-16 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 animate-pulse" />
          <div className="mx-4 mt-4 h-24 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 animate-pulse" />
          <div className="mx-4 mt-4 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      ) : isDataError ? (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Couldn't load this class</p>
            <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 h-9 px-4 bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Recovered/offline draft banners */}
          {showRecoveryBanner && (
            <RecoveryBanner savedAt={draft.lastSavedAt} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
          )}
          {draft.isOffline && <OfflineBanner />}

          {/* Already submitted banner */}
          {alreadySubmitted && (
            <div className="mx-4 mt-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Attendance already submitted for this date
              </p>
            </div>
          )}

          {/* Mark All Present (toggle) + Swipe mode switch */}
          {editable && rows.length > 0 && (
            <div className="px-4 mt-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleMarkAllPresent}
                className={cn(
                  'flex-1 h-11 font-bold rounded-xl text-sm transition-all',
                  isAllPresent
                    ? 'bg-[#A855F7]/10 dark:bg-[#A855F7]/15 hover:bg-[#A855F7]/20 dark:hover:bg-[#A855F7]/25 text-[#5B21B6] dark:text-violet-300'
                    : 'text-white bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 shadow-md shadow-violet-500/20',
                )}
              >
                {isAllPresent ? 'Unmark All' : 'Mark All Present'}
              </button>
              <button
                type="button"
                onClick={() => setSwipeMode((v) => !v)}
                className="h-11 px-3 flex items-center gap-2 bg-white dark:bg-[#150C29] border border-gray-200 dark:border-white/10 rounded-xl shrink-0"
                title="Toggle swipe mode"
              >
                <span className="text-xs font-semibold text-gray-500 dark:text-white/50">Swipe</span>
                <span
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors shrink-0',
                    swipeMode ? 'bg-[#A855F7]' : 'bg-gray-200 dark:bg-white/10',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      swipeMode ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-11 h-11 flex items-center justify-center bg-white dark:bg-[#150C29] border border-gray-200 dark:border-white/10 rounded-xl shrink-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                title="Search students"
              >
                <Search className="w-4 h-4 text-gray-500 dark:text-white/50" />
              </button>
            </div>
          )}

          {/* Active swipeable card */}
          {editable && useSwipeFlow && activeIndex !== -1 && (
            <div className="px-4 mt-4">
              <ActiveCard
                key={rows[activeIndex].studentId}
                row={rows[activeIndex]}
                onMark={markStatus}
              />
            </div>
          )}

          {/* Student list */}
          <div className="mx-4 mt-4 bg-white dark:bg-[#150C29] rounded-2xl shadow-sm border border-transparent dark:border-white/10 overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-white/50">No students in this class</p>
                <button
                  onClick={() => navigate(`/teacher/classes/${cls}/${section}/add-student`)}
                  className="mt-4 h-10 px-5 bg-[#5B21B6] text-white rounded-xl text-sm font-semibold hover:bg-[#4C1D95] transition-colors"
                >
                  Add Students
                </button>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400 dark:text-white/30">No students match "{searchQuery}"</p>
              </div>
            ) : (
              filteredRows
                .filter((row) => !useSwipeFlow || !editable || row.studentId !== rows[activeIndex]?.studentId)
                // Marked rows sink to the bottom, in the order they were marked —
                // the unmarked queue at top always mirrors roll-number order.
                .slice()
                .sort((a, b) => {
                  if (a.status === 'unmarked' && b.status === 'unmarked') return 0;
                  if (a.status === 'unmarked') return -1;
                  if (b.status === 'unmarked') return 1;
                  return (a.markedSeq ?? 0) - (b.markedSeq ?? 0);
                })
                .map((row) => (
                  <CompactRow
                    key={row.studentId}
                    row={row}
                    index={rows.findIndex((r) => r.studentId === row.studentId)}
                    editable={editable}
                    onUndo={undoStatus}
                    onMark={useSwipeFlow ? undefined : markStatus}
                    glowStatus={glowId === row.studentId ? glowStatus : null}
                  />
                ))
            )}
          </div>

          {/* Absent Students Summary — live preview while marking, mirrors the reference design */}
          {rows.length > 0 && (
            <div className="mx-4 mt-4 mb-2 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
                Absent Students Summary
              </p>
              {absentCount === 0 ? (
                <p className="text-sm text-gray-400 dark:text-white/30">No students marked absent yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {rows.filter((r) => r.status === 'absent').map((r) => (
                    <span
                      key={r.studentId}
                      className="text-xs font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-full px-2.5 py-1"
                    >
                      {r.fullName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Attendance button — allows partial saves. A teacher marking a
              big class may get interrupted; blocking Save until every single
              student is swiped would force them to redo everything later
              instead of saving progress and finishing when they get back. */}
          {editable && rows.length > 0 && (
            <>
            {/* Spacer so the fixed bar below never covers the last card in the scroll area */}
            <div className="h-[168px] lg:h-[140px]" aria-hidden="true" />
            <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 px-4 py-4 bg-[#F8FAFC] dark:bg-[#0B0518] border-t border-gray-200/60 dark:border-white/5">
              {/* Save button — fills up like a liquid progress bar as students get marked */}
              <div className="relative w-full h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 shadow-none dark:border dark:border-white/10">
                {/* Liquid fill */}
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 to-pink-500"
                  initial={false}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                />

                {/* Clickable surface + base (unfilled) label */}
                <button
                  type="button"
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={isPending}
                  className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 text-base font-bold text-gray-400 dark:text-white/30 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving…
                    </>
                  ) : unmarkedCount > 0 ? (
                    `Save (${unmarkedCount} unmarked)`
                  ) : (
                    'Save Attendance'
                  )}
                </button>

                {/* White label clipped to the fill — only visible over the filled portion */}
                <div
                  className="absolute inset-0 flex items-center justify-center gap-2 text-base font-bold text-white pointer-events-none overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - completionPercent}% 0 0)` }}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving…
                    </>
                  ) : unmarkedCount > 0 ? (
                    `Save (${unmarkedCount} unmarked)`
                  ) : (
                    'Save Attendance'
                  )}
                </div>
              </div>
            </div>
            </>
          )}

          {showSaveConfirm && (
            <ConfirmDialog
              title="Submit Attendance?"
              description={
                unmarkedCount > 0
                  ? `${unmarkedCount} student${unmarkedCount === 1 ? '' : 's'} ${unmarkedCount === 1 ? 'is' : 'are'} still unmarked. Would you like to submit the attendance now?`
                  : 'Would you like to submit the attendance for this class?'
              }
              variant="warning"
              confirmLabel="Yes, Submit"
              cancelLabel="Cancel"
              isLoading={isPending}
              onConfirm={handleSave}
              onCancel={() => setShowSaveConfirm(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
