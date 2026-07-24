import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Lock,
  Plus,
  X,
  Smile,
  Frown,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import {
  useBehaviorOptions,
  useBehaviorWindowStatus,
  useClassBehaviorRecords,
  useMarkBehavior,
  useCreateBehaviorOption,
} from '@/features/behavior/hooks/useBehavior';
import type { BehaviorCategory, BehaviorOption } from '@schoolos/types';
import { cn } from '@/lib/utils';
import { avatarColorFor } from '../utils/avatarColor';

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ascending roll-number sort — numeric when possible, falling back to a plain string compare for non-numeric rolls. Mirrors TeacherAttendancePage's ordering. */
function compareRollNumber(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

const CATEGORY_META: Record<BehaviorCategory, { icon: React.ElementType; text: string; bg: string; ring: string; dot: string }> = {
  positive: { icon: Smile, text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', ring: 'ring-emerald-300 dark:ring-emerald-400/40', dot: 'bg-emerald-500' },
  negative: { icon: Frown,  text: 'text-red-500 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10',        ring: 'ring-red-300 dark:ring-red-400/40',        dot: 'bg-red-500' },
  neutral:  { icon: Minus,  text: 'text-gray-500 dark:text-white/50',      bg: 'bg-gray-100 dark:bg-white/5',         ring: 'ring-gray-300 dark:ring-white/20',          dot: 'bg-gray-400' },
};

function StudentAvatar({ studentId, fullName, photoUrl }: { studentId: string; fullName: string; photoUrl?: string }) {
  const initials = fullName.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
  const color = avatarColorFor(studentId);
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden', color.bg)}>
      {photoUrl ? (
        <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className={cn('font-bold text-xs', color.text)}>{initials}</span>
      )}
    </div>
  );
}

// ── Inline "add a custom option" form ─────────────────────────────────────────

function AddCustomOptionForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { mutateAsync: createOption, isPending, error } = useCreateBehaviorOption();
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<BehaviorCategory>('neutral');
  const errMsg = error instanceof Error ? error.message : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const created = await createOption({ label: trimmed, category });
    onCreated(created._id);
    onClose();
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/[0.03] space-y-2"
    >
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Great teamwork"
          className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
        />
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        {(['positive', 'negative', 'neutral'] as BehaviorCategory[]).map((c) => {
          const meta = CATEGORY_META[c];
          const Icon = meta.icon;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors',
                category === c ? cn(meta.bg, meta.text, 'ring-1', meta.ring) : 'text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/5',
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {c === 'negative' ? 'Needs attention' : c[0].toUpperCase() + c.slice(1)}
            </button>
          );
        })}
        <button
          type="submit"
          disabled={isPending || !label.trim()}
          className="ml-auto h-8 px-3 rounded-lg text-xs font-bold text-white bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 flex items-center gap-1.5"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Add
        </button>
      </div>
      {errMsg && <p className="text-xs text-red-500 dark:text-red-400">{errMsg}</p>}
    </form>
  );
}

// ── Student row with expandable option picker ─────────────────────────────────

function StudentRow({
  studentId,
  fullName,
  rollNumber,
  photoUrl,
  options,
  todayMarks,
  disabled,
}: {
  studentId: string;
  fullName: string;
  rollNumber?: string;
  photoUrl?: string;
  options: BehaviorOption[];
  todayMarks: { optionLabel: string; category: string }[];
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const today = toDateStr(new Date());
  const { mutateAsync: markBehavior, isPending } = useMarkBehavior();

  async function handleSave() {
    if (!pendingOptionId || !cls || !section) return;
    try {
      await markBehavior({
        studentId, class: cls, section, date: today, optionId: pendingOptionId,
        note: note.trim() || undefined,
      });
      setPendingOptionId(null);
      setNote('');
      setExpanded(false);
      toast.success(`Marked "${fullName}"`);
    } catch (err) {
      toast.error('Could not save', { description: err instanceof Error ? err.message : 'Try again.' });
    }
  }

  return (
    <div className="border-b border-gray-50 dark:border-white/5 last:border-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:opacity-50 hover:bg-gray-50/60 dark:hover:bg-white/[0.03] transition-colors"
      >
        <StudentAvatar studentId={studentId} fullName={fullName} photoUrl={photoUrl} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
          {rollNumber && <p className="text-[11px] text-gray-400 dark:text-white/30">Roll No: {rollNumber}</p>}
        </div>
        {todayMarks.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {todayMarks.slice(0, 3).map((m, i) => {
              const meta = CATEGORY_META[(m.category as BehaviorCategory)] ?? CATEGORY_META.neutral;
              return (
                <span key={i} className={cn('w-2 h-2 rounded-full', meta.dot)} title={m.optionLabel} />
              );
            })}
            {todayMarks.length > 3 && <span className="text-[10px] text-gray-400 dark:text-white/30">+{todayMarks.length - 3}</span>}
          </div>
        )}
      </button>

      {expanded && !disabled && (
        <div className="px-4 pb-4 pl-16">
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const meta = CATEGORY_META[opt.category];
              const Icon = meta.icon;
              const selected = pendingOptionId === opt._id;
              return (
                <button
                  key={opt._id}
                  type="button"
                  onClick={() => setPendingOptionId(opt._id)}
                  className={cn(
                    'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border',
                    selected
                      ? cn(meta.bg, meta.text, 'ring-1', meta.ring, 'border-transparent')
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {opt.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAddOption((v) => !v)}
              className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <Plus className="w-3.5 h-3.5" /> Add custom option
            </button>
          </div>

          {showAddOption && (
            <AddCustomOptionForm
              onClose={() => setShowAddOption(false)}
              onCreated={(id) => setPendingOptionId(id)}
            />
          )}

          {pendingOptionId && (
            <div className="mt-3 space-y-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note…"
                maxLength={300}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
              />
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isPending}
                className="h-9 px-4 rounded-lg text-xs font-bold text-white bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-60 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Mark
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TeacherBehaviorPage() {
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const navigate = useNavigate();
  const today = toDateStr(new Date());

  const { data: studentsData, isLoading: studentsLoading, isError: studentsError } = useStudentsPaginated({
    class: cls, section, limit: 300, status: 'active',
  });
  const { data: options, isLoading: optionsLoading } = useBehaviorOptions();
  const { data: windowStatus, isLoading: windowLoading } = useBehaviorWindowStatus();
  const { data: todayRecords } = useClassBehaviorRecords(cls ?? '', section ?? '', today);

  const marksByStudent = useMemo(() => {
    const map = new Map<string, { optionLabel: string; category: string }[]>();
    for (const r of todayRecords ?? []) {
      const list = map.get(r.studentId) ?? [];
      list.push({ optionLabel: r.optionLabel, category: r.category });
      map.set(r.studentId, list);
    }
    return map;
  }, [todayRecords]);

  const students = useMemo(
    () => [...(studentsData?.data ?? [])].sort((a, b) => compareRollNumber(a.rollNumber, b.rollNumber)),
    [studentsData],
  );
  const activeOptions = (options ?? []).filter((o) => o.isActive);
  const isLoading = studentsLoading || optionsLoading || windowLoading;
  const isClosed = windowStatus ? !windowStatus.isOpen : false;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0518] flex flex-col">
      {/* Header */}
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              Behaviour Marking — Class {cls}{section ? `-${section}` : ''}
            </p>
            <p className="text-xs text-gray-400 dark:text-white/40">Today</p>
          </div>
        </div>
      </div>

      {/* Window status banner */}
      {!windowLoading && windowStatus && (
        <div className="px-4 mt-4">
          {windowStatus.isOpen ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-3 py-2.5">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Open until {windowStatus.endTime} today
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Closed for today — opens {windowStatus.startTime}, closes {windowStatus.endTime}
              </p>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="mx-4 mt-4 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center px-4 py-3 border-b border-gray-50 dark:border-white/5 gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 shrink-0" />
              <div className="h-4 bg-gray-100 dark:bg-white/10 rounded w-32" />
            </div>
          ))}
        </div>
      ) : studentsError ? (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Couldn't load this class</p>
            <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Check your connection and try again.</p>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 bg-white dark:bg-[#150C29] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden mb-6">
          {students.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-white/30 text-center py-8">No active students in this class.</p>
          ) : (
            students.map((s) => (
              <StudentRow
                key={s._id}
                studentId={s._id}
                fullName={s.fullName}
                rollNumber={s.rollNumber}
                photoUrl={s.photoUrl}
                options={activeOptions}
                todayMarks={marksByStudent.get(s._id) ?? []}
                disabled={isClosed}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
