import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Plus, SlidersHorizontal, X } from 'lucide-react';
import {
  useSubstitutes,
  useNeedsSubstitute,
  useSuggestSubstituteTeachers,
  useCreateSubstitute,
  useDeleteSubstitute,
  usePeriodSlots,
  useTimetables,
} from '@/features/timetable/hooks/useTimetable';
import { SubstituteForm } from '@/features/timetable/components/SubstituteForm';
import {
  usePendingLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '@/features/leave-requests/hooks/useLeaveRequests';
import { useLanguage } from '@/context/LanguageContext';
import type { LeaveRequest, Timetable } from '@schoolos/types';

// Local calendar date (not UTC) — toISOString() would roll over a day early
// for any timezone ahead of UTC (e.g. IST), showing the wrong weekday/date
// in the header and querying substitutes for the wrong day.
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const AVATAR_COLORS = [
  { bg: '#FCE7F3', fg: '#DB2777' },
  { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#DCFCE7', fg: '#16A34A' },
  { bg: '#EDE9FE', fg: '#6D28D9' },
  { bg: '#FFE4E6', fg: '#E11D48' },
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

// What's needed to create (or re-create) a substitute assignment for one
// period — a shared shape so both an unfilled NeedsSubstituteEntry and a
// cancelled/reassignable TimetableSubstitute can feed the same picker.
interface AssignTarget {
  timetableId: string;
  class: string;
  section: string;
  slotId: string;
  subjectName: string;
  date: string;
  dayOfWeek: number;
  originalTeacherId: string;
  originalTeacherName: string;
}

interface PeriodItem {
  key: string;
  slotName: string;
  orderIndex: number;
  subjectName: string;
  class: string;
  section: string;
  target: AssignTarget;
  substituteId?: string;
  substituteName?: string;
  status: 'unfilled' | 'active' | 'cancelled';
}

interface TeacherRow {
  teacherId: string;
  teacherName: string;
  periods: PeriodItem[];
}

function AssignPicker({ target, onDone }: { target: AssignTarget; onDone: () => void }) {
  const { t } = useLanguage();
  const { data: suggestions, isLoading } = useSuggestSubstituteTeachers(
    target.class, target.section, target.originalTeacherId, target.dayOfWeek,
  );
  const { mutateAsync: createSubstitute, isPending } = useCreateSubstitute();
  const [error, setError] = useState('');

  async function assign(teacherId: string, teacherName: string) {
    setError('');
    try {
      await createSubstitute({
        timetableId: target.timetableId,
        class: target.class,
        section: target.section,
        date: target.date,
        dayOfWeek: target.dayOfWeek,
        slotId: target.slotId,
        subjectName: target.subjectName,
        originalTeacherId: target.originalTeacherId,
        originalTeacherName: target.originalTeacherName,
        substituteTeacherId: teacherId,
        substituteTeacherName: teacherName,
        reason: 'Approved leave',
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign substitute');
    }
  }

  return (
    <div className="mt-2 bg-[#F59E0B]/5 border border-[#F59E0B]/15 rounded-xl p-2.5 max-h-32 overflow-y-auto">
      {isLoading ? (
        <p className="text-xs text-gray-400 py-2">{t('staff.findingTeachers')}</p>
      ) : !suggestions?.length ? (
        <p className="text-xs text-gray-400 py-1">{t('staff.noTeachersAvailable')}</p>
      ) : (
        <div className="space-y-1">
          {suggestions.map((s) => (
            <button
              key={s.teacherId}
              type="button"
              disabled={isPending}
              onClick={() => void assign(s.teacherId, s.teacherName)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white text-left transition-colors disabled:opacity-50"
            >
              <span className="text-xs font-medium text-gray-700 truncate">{s.teacherName}</span>
              <span className="flex items-center gap-2 shrink-0 text-[10px] font-semibold">
                {s.teachesThisClass && <span className="text-[#F59E0B]">{t('staff.teachesThisClass')}</span>}
                <span className={s.freePeriodsToday > 0 ? 'text-[#22C55E]' : 'text-gray-400'}>
                  {s.freePeriodsToday} {t('staff.free')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-[11px] text-[#EF4444] mt-1 px-1">{error}</p>}
    </div>
  );
}

function PeriodManageRow({ period }: { period: PeriodItem }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'idle' | 'picking' | 'confirmCancel'>('idle');
  const { mutate: del, isPending: delPending } = useDeleteSubstitute(period.substituteId ?? '');
  const label = `${period.slotName} · ${period.subjectName}`;

  if (period.status === 'unfilled' || mode === 'picking') {
    return (
      <div className="py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-600 truncate">{label}</span>
          {period.status !== 'unfilled' && (
            <button type="button" onClick={() => setMode('idle')} className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0">
              {t('staff.close')}
            </button>
          )}
        </div>
        <AssignPicker target={period.target} onDone={() => setMode('idle')} />
      </div>
    );
  }

  if (period.status === 'active') {
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-600 truncate">{label}</p>
          <p className="text-[11px] text-[#16A34A] font-semibold truncate">{period.substituteName}</p>
        </div>
        {mode === 'confirmCancel' ? (
          <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
            <span className="text-red-600 font-medium">{t('staff.cancelAllConfirm')}</span>
            <button
              type="button"
              disabled={delPending}
              onClick={() => del(undefined, { onSuccess: () => setMode('idle') })}
              className="font-bold text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {t('staff.yes')}
            </button>
            <button type="button" onClick={() => setMode('idle')} className="font-bold text-gray-400 hover:text-gray-700">
              {t('staff.no')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMode('picking')}
              className="h-6 px-2 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] font-semibold text-gray-600"
            >
              {t('staff.reassign')}
            </button>
            <button
              type="button"
              onClick={() => setMode('confirmCancel')}
              className="h-6 px-2 rounded-md bg-red-50 hover:bg-red-100 text-[11px] font-semibold text-red-600"
            >
              {t('staff.cancelAll')}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-600 truncate">{label}</p>
        <p className="text-[11px] text-gray-400 line-through truncate">{period.substituteName}</p>
      </div>
      <button
        type="button"
        onClick={() => setMode('picking')}
        className="h-6 px-2 rounded-md bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[11px] font-semibold text-[#B45309] shrink-0"
      >
        {t('staff.reassign')}
      </button>
    </div>
  );
}

function TeacherRowView({ row }: { row: TeacherRow }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const sorted = [...row.periods].sort((a, b) => a.orderIndex - b.orderIndex);
  const allFilled = sorted.length > 0 && sorted.every((p) => p.status === 'active');
  const color = colorFor(row.teacherId);

  const subjectLabel = Array.from(new Set(sorted.map((p) => p.subjectName))).join(', ');
  const classLabel = Array.from(
    new Set(sorted.map((p) => `${t('staff.class')} ${p.class}${p.section ? ` – ${p.section}` : ''}`)),
  ).join(', ');
  const periodNames = sorted.map((p) => p.slotName);
  const periodsLabel =
    periodNames.length <= 1
      ? periodNames[0] ?? ''
      : periodNames.length === 2
        ? `${periodNames[0]} & ${periodNames[1]}`
        : `${periodNames.slice(0, -1).join(', ')} & ${periodNames[periodNames.length - 1]}`;

  const activeSubNames = Array.from(new Set(sorted.filter((p) => p.status === 'active').map((p) => p.substituteName!)));

  return (
    <div className="border-b border-black/[0.05] last:border-b-0">
      <div className="grid grid-cols-[1.6fr_1.4fr_1.1fr_1.4fr_1fr_0.6fr] items-center gap-3 py-3 px-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: color.bg, color: color.fg }}
          >
            {initials(row.teacherName)}
          </span>
          <p className="text-[13px] font-semibold text-[#111827] truncate">{row.teacherName}</p>
        </div>

        <div className="min-w-0">
          <p className="text-[13px] text-[#111827] truncate">{subjectLabel}</p>
          <p className="text-[11px] text-[#6B7280] truncate">{classLabel}</p>
        </div>

        <div className="min-w-0">
          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-semibold truncate max-w-full">
            {periodsLabel}
          </span>
        </div>

        <div className="min-w-0">
          {activeSubNames.length === 0 ? (
            <span className="text-[12px] font-semibold text-[#B45309]">{t('staff.matchPending')}</span>
          ) : (
            <p className="text-[13px] font-medium text-[#111827] truncate">
              {activeSubNames[0]}
              {activeSubNames.length > 1 ? ` +${activeSubNames.length - 1}` : ''}
            </p>
          )}
        </div>

        <div>
          <span
            className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold ${
              allFilled ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEF3C7] text-[#B45309]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${allFilled ? 'bg-[#16A34A]' : 'bg-[#F59E0B]'}`} />
            {allFilled ? t('staff.confirmed') : t('staff.requiresAction')}
          </span>
        </div>

        <div className="flex items-center justify-end relative">
          {allFilled ? (
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-[12px] font-semibold text-[#6D4AFF] hover:text-[#5B3FE0]"
            >
              {expanded ? t('staff.close') : t('staff.assign')}
            </button>
          )}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-36 bg-white rounded-xl border border-black/[0.08] shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => { setExpanded(true); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50"
                >
                  {t('staff.reassign')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="bg-black/[0.015] rounded-xl mx-1 mb-3 px-3 divide-y divide-black/[0.05]">
          {sorted.map((p) => <PeriodManageRow key={p.key} period={p} />)}
        </div>
      )}
    </div>
  );
}

function LeaveRow({ request }: { request: LeaveRequest }) {
  const { t } = useLanguage();
  const { mutateAsync: approve, isPending: approving } = useApproveLeaveRequest();
  const { mutateAsync: reject, isPending: rejecting } = useRejectLeaveRequest();
  const [rejectingLocal, setRejectingLocal] = useState(false);
  const busy = approving || rejecting;

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#111827] truncate">{request.teacherName}</p>
        <p className="text-[11px] text-[#6B7280] truncate">
          {request.leaveType === 'full_day' ? t('staff.fullDay') : t('staff.halfDay')}
          {' · '}
          {request.dateFrom === request.dateTo ? request.dateFrom : `${request.dateFrom} – ${request.dateTo}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={() => void approve(request._id)}
          className="h-7 px-2.5 rounded-lg bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#16A34A] text-[11px] font-semibold disabled:opacity-50"
        >
          {approving ? t('staff.approving') : t('staff.approve')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setRejectingLocal(true); void reject({ id: request._id, payload: {} }).finally(() => setRejectingLocal(false)); }}
          className="h-7 px-2.5 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-[11px] font-semibold disabled:opacity-50"
        >
          {rejectingLocal ? t('staff.rejecting') : t('staff.reject')}
        </button>
      </div>
    </div>
  );
}

// Merges the old Daily Substitutions and Leave Approvals cards — both are
// staff-facing decisions a Principal makes at the same point in the day, so
// they now share one card: a coverage-plan table grouped by absent teacher
// (one row per teacher, one pill per affected period), with pending leave
// approvals underneath.
export function StaffManagementCard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const today = todayStr();

  const [dateFilter, setDateFilter] = useState(today);
  const [classFilter, setClassFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTt, setSelectedTt] = useState<Timetable | null>(null);

  const { data: subsData, isLoading: subsLoading } = useSubstitutes({ dateFrom: dateFilter, dateTo: dateFilter, limit: 100 });
  const { data: needed, isLoading: neededLoading } = useNeedsSubstitute(dateFilter);
  const { data: leaveRequests, isLoading: leaveLoading } = usePendingLeaveRequests();
  const { data: slots = [] } = usePeriodSlots();
  const { data: ttData } = useTimetables({ status: 'published', limit: 100 });

  const substitutes = subsData?.data ?? [];
  const pendingLeave = leaveRequests ?? [];
  const timetables = ttData?.data ?? [];
  const isLoading = subsLoading || neededLoading || leaveLoading;

  const slotById = useMemo(() => new Map(slots.map((s) => [s._id, s])), [slots]);
  const classOptions = useMemo(() => Array.from(new Set(timetables.map((tt) => tt.class))).sort(), [timetables]);

  const rows = useMemo(() => {
    const map = new Map<string, TeacherRow>();

    for (const n of needed ?? []) {
      const slot = slotById.get(n.slotId);
      const row = map.get(n.originalTeacherId) ?? { teacherId: n.originalTeacherId, teacherName: n.originalTeacherName, periods: [] };
      row.periods.push({
        key: `${n.class}||${n.section}||${n.slotId}`,
        slotName: slot?.name ?? t('staff.period'),
        orderIndex: slot?.orderIndex ?? 0,
        subjectName: n.subjectName,
        class: n.class,
        section: n.section,
        target: {
          timetableId: n.timetableId,
          class: n.class,
          section: n.section,
          slotId: n.slotId,
          subjectName: n.subjectName,
          date: n.date,
          dayOfWeek: n.dayOfWeek,
          originalTeacherId: n.originalTeacherId,
          originalTeacherName: n.originalTeacherName,
        },
        status: 'unfilled',
      });
      map.set(n.originalTeacherId, row);
    }

    for (const sub of substitutes) {
      const teacherId = sub.originalTeacherId ?? `manual-${sub._id}`;
      const teacherName = sub.originalTeacherName ?? sub.substituteTeacherName;
      const slot = slotById.get(sub.slotId);
      const row = map.get(teacherId) ?? { teacherId, teacherName, periods: [] };
      row.periods.push({
        key: `${sub.class}||${sub.section}||${sub.slotId}||${sub._id}`,
        slotName: slot?.name ?? t('staff.period'),
        orderIndex: slot?.orderIndex ?? 0,
        subjectName: sub.subjectName,
        class: sub.class,
        section: sub.section,
        target: {
          timetableId: sub.timetableId,
          class: sub.class,
          section: sub.section,
          slotId: sub.slotId,
          subjectName: sub.subjectName,
          date: sub.date.slice(0, 10),
          dayOfWeek: sub.dayOfWeek,
          originalTeacherId: sub.originalTeacherId ?? '',
          originalTeacherName: sub.originalTeacherName ?? '',
        },
        substituteId: sub._id,
        substituteName: sub.substituteTeacherName,
        status: sub.status === 'active' ? 'active' : 'cancelled',
      });
      map.set(teacherId, row);
    }

    const all = Array.from(map.values());
    return classFilter ? all.filter((row) => row.periods.some((p) => p.class === classFilter)) : all;
  }, [needed, substitutes, slotById, classFilter, t]);

  const isEmpty = !isLoading && rows.length === 0 && pendingLeave.length === 0;

  const formattedDate = useMemo(() => {
    const [y, m, d] = dateFilter.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [dateFilter]);

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="text-[16px] font-semibold text-[#111827] tracking-tight">{t('staff.title')}</h3>
          <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
            {t('staff.subtitleFor')} {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className={`h-8 px-3 rounded-lg border text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${
              showFilters
                ? 'bg-[#6D4AFF]/10 border-[#6D4AFF]/25 text-[#6D4AFF]'
                : 'bg-white border-black/[0.08] text-[#6B7280] hover:border-[#6D4AFF]/25 hover:text-[#6D4AFF]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t('staff.filter')}
          </button>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="h-8 px-3 rounded-lg bg-[#111827] hover:bg-[#1F2937] text-[12px] font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('staff.assignSubstitute')}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-[12px] focus:outline-none focus:border-[#6D4AFF]"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-9 pl-3 pr-7 rounded-lg border border-gray-200 bg-white text-[12px] cursor-pointer focus:outline-none focus:border-[#6D4AFF]"
          >
            <option value="">{t('staff.allClasses')}</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>{t('staff.class')} {cls}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => navigate('/timetable/substitutes')}
            className="h-9 px-3 rounded-lg text-[12px] font-semibold text-[#6B7280] hover:text-[#6D4AFF] ml-auto"
          >
            {t('staff.manage')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-6 text-center text-sm text-gray-400">{t('staff.loading')}</div>
      ) : isEmpty ? (
        <div className="py-10 text-center text-sm text-gray-400">{t('staff.emptyAll')}</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          {classFilter ? t('staff.emptyFiltered') : t('staff.noCoverageToday')}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <div className="min-w-[780px] px-1">
            <div className="grid grid-cols-[1.6fr_1.4fr_1.1fr_1.4fr_1fr_0.6fr] gap-3 px-1 pb-2 border-b border-black/[0.06]">
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{t('staff.absentFaculty')}</span>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{t('staff.subjectDept')}</span>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{t('staff.affectedPeriods')}</span>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{t('staff.assignedSubstitute')}</span>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{t('staff.status')}</span>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide text-right">{t('staff.actions')}</span>
            </div>
            {rows.map((row) => <TeacherRowView key={row.teacherId} row={row} />)}
          </div>
        </div>
      )}

      {pendingLeave.length > 0 && (
        <div className="mt-5 pt-5 border-t border-black/[0.06]">
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{t('staff.leaveApprovals')}</p>
          <p className="text-[11px] text-[#9CA3AF] mb-1">{t('staff.viewLeaveApprovals')}</p>
          <div className="divide-y divide-black/[0.06]">
            {pendingLeave.map((request) => <LeaveRow key={request._id} request={request} />)}
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAssignModal(false); setSelectedTt(null); }} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{t('staff.assignSubstitute')}</h2>
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setSelectedTt(null); }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  {t('staff.selectClass')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTt?._id ?? ''}
                  onChange={(e) => setSelectedTt(timetables.find((tt) => tt._id === e.target.value) ?? null)}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="">{t('staff.selectPublishedTimetable')}</option>
                  {timetables.map((tt) => (
                    <option key={tt._id} value={tt._id}>Class {tt.class}-{tt.section} ({tt.academicYear})</option>
                  ))}
                </select>
              </div>

              {selectedTt ? (
                <SubstituteForm
                  timetable={selectedTt}
                  slots={slots}
                  onSuccess={() => { setShowAssignModal(false); setSelectedTt(null); }}
                  onCancel={() => { setShowAssignModal(false); setSelectedTt(null); }}
                />
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Select a class above to continue.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
