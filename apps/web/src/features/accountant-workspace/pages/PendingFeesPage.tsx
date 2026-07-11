import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Send, ChevronDown, CalendarClock, IndianRupee, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useFeeList } from '@/features/fees/hooks/useFees';
import { useGroupedDefaulters } from '../hooks/useAccountantWorkspace';
import { useClassSections } from '@/features/administration/hooks/useClasses';
import { SendDefaultersModal } from '../components/SendDefaultersModal';
import type { FeeRecord, ClassDefaulterGroup } from '@schoolos/types';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Every fee record returned is already dueDate <= selectedDate (server-side
// filter), so "earlier dues" just means the record's due month/year is
// earlier than the selected date's — no need to fetch anything extra.
function isSameMonth(dateStr: string, selectedDate: string): boolean {
  const d = new Date(dateStr);
  const s = new Date(selectedDate + 'T00:00:00');
  return d.getFullYear() === s.getFullYear() && d.getMonth() === s.getMonth();
}

interface StudentGroup {
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  totalDue: number;
  records: FeeRecord[];
  hasEarlierDues: boolean;
}

interface ClassGroup {
  class: string;
  students: StudentGroup[];
  totalDue: number;
}

function groupByClass(records: FeeRecord[], selectedDate: string): ClassGroup[] {
  const byStudent = new Map<string, StudentGroup>();
  for (const r of records) {
    const existing = byStudent.get(r.studentId);
    const earlier = !isSameMonth(r.dueDate, selectedDate);
    if (existing) {
      existing.totalDue += r.balance;
      existing.records.push(r);
      existing.hasEarlierDues = existing.hasEarlierDues || earlier;
    } else {
      byStudent.set(r.studentId, {
        studentId: r.studentId, studentName: r.studentName, class: r.class, section: r.section,
        totalDue: r.balance, records: [r], hasEarlierDues: earlier,
      });
    }
  }

  const byClass = new Map<string, ClassGroup>();
  for (const s of byStudent.values()) {
    const existing = byClass.get(s.class);
    if (existing) {
      existing.students.push(s);
      existing.totalDue += s.totalDue;
    } else {
      byClass.set(s.class, { class: s.class, students: [s], totalDue: s.totalDue });
    }
  }

  return [...byClass.values()]
    .map((g) => ({ ...g, students: g.students.sort((a, b) => b.totalDue - a.totalDue) }))
    .sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }));
}

// ── One student row, expandable to show current-month vs earlier-dues breakdown ──

function StudentRow({ student, selectedDate }: { student: StudentGroup; selectedDate: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const currentMonthDue = student.records.filter((r) => isSameMonth(r.dueDate, selectedDate)).reduce((s, r) => s + r.balance, 0);
  const earlierDue = student.totalDue - currentMonthDue;
  const earlierCount = student.records.filter((r) => !isSameMonth(r.dueDate, selectedDate)).length;

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 font-bold text-xs shrink-0">
          {student.studentName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{student.studentName}</p>
          <p className="text-xs text-gray-400">Class {student.class}-{student.section}</p>
        </div>
        <span
          className={cn(
            'text-[11px] font-bold px-2 py-1 rounded-full shrink-0',
            student.hasEarlierDues ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
          )}
        >
          {student.hasEarlierDues ? 'Also has earlier dues' : 'This month only'}
        </span>
        <p className="text-sm font-bold text-gray-800 w-24 text-right shrink-0">{fmt(student.totalDue)}</p>
        <ChevronDown className={cn('w-4 h-4 text-gray-300 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 pl-16 space-y-2.5">
          <div className="rounded-xl bg-gray-50 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Current month</span>
              <span className="font-bold text-gray-800">{currentMonthDue > 0 ? fmt(currentMonthDue) : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Earlier dues ({earlierCount} record{earlierCount !== 1 ? 's' : ''})</span>
              <span className="font-bold text-gray-800">{earlierDue > 0 ? fmt(earlierDue) : '—'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/accountant/student-ledger/${student.studentId}`)}
            className="w-full h-9 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <IndianRupee className="w-3.5 h-3.5" /> Open Student Ledger to Collect
          </button>
        </div>
      )}
    </div>
  );
}

// ── Notify class teachers panel ─────────────────────────────────────────────────

function NotifyClassTeachersPanel({ onClose }: { onClose: () => void }) {
  const { data: sections, isLoading: sectionsLoading } = useClassSections();
  const { data: defaulterGroups, isLoading: defaultersLoading } = useGroupedDefaulters();
  const [sendingGroup, setSendingGroup] = useState<ClassDefaulterGroup | null>(null);
  const isLoading = sectionsLoading || defaultersLoading;

  // Every class-section that's been created, cross-referenced with its
  // current defaulter total (0 for classes with nothing outstanding).
  const rows = useMemo<ClassDefaulterGroup[]>(() => {
    if (!sections) return [];
    const byKey = new Map((defaulterGroups ?? []).map((g) => [`${g.class}||${g.section}`, g]));
    return sections
      .map((s) => byKey.get(`${s.class}||${s.section}`) ?? {
        class: s.class, section: s.section, totalBalance: 0, students: [],
        classTeacherId: s.teacherId, classTeacherName: s.teacherName,
      })
      .sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }) || a.section.localeCompare(b.section));
  }, [sections, defaulterGroups]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900">Notify Class Teachers</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Every class, with its class teacher — send a fee defaulter list where one's outstanding.</p>

        {isLoading ? (
          <div className="py-6 flex justify-center text-sm text-gray-400">Loading…</div>
        ) : !rows.length ? (
          <p className="text-sm text-gray-400 text-center py-8">No classes set up yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((g) => {
              const hasDefaulters = g.students.length > 0;
              return (
                <div key={`${g.class}-${g.section}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">Class {g.class}-{g.section}</p>
                    <p className="text-xs text-gray-400">
                      {g.classTeacherName ? <>Teacher: {g.classTeacherName}</> : <span className="text-amber-600 font-medium">No class teacher assigned</span>}
                      {hasDefaulters && <> · {g.students.length} student{g.students.length !== 1 ? 's' : ''} · {fmt(g.totalBalance)}</>}
                    </p>
                  </div>
                  {hasDefaulters ? (
                    <button
                      onClick={() => setSendingGroup(g)}
                      className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  ) : (
                    <span className="text-xs text-gray-300 shrink-0">No pending fees</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {sendingGroup && <SendDefaultersModal group={sendingGroup} onClose={() => setSendingGroup(null)} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PendingFeesPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [notifyOpen, setNotifyOpen] = useState(false);

  const { data, isLoading } = useFeeList({
    dueBefore: selectedDate,
    sortBy: 'dueDate',
    sortOrder: 'asc',
    limit: 500,
  });

  const unpaidRecords = useMemo(
    () => (data?.data ?? []).filter((f) => f.status !== 'paid' && f.status !== 'waived'),
    [data],
  );
  const classGroups = useMemo(() => groupByClass(unpaidRecords, selectedDate), [unpaidRecords, selectedDate]);
  const totalStudents = classGroups.reduce((s, g) => s + g.students.length, 0);
  const totalDue = classGroups.reduce((s, g) => s + g.totalDue, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/accountant')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Pending Fees</h1>
          <p className="text-xs text-gray-500">
            {totalStudents} student{totalStudents !== 1 ? 's' : ''} · {fmt(totalDue)} outstanding as of the selected date
          </p>
        </div>
        <button
          onClick={() => setNotifyOpen(true)}
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Notify Teachers
        </button>
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        {/* The only filter — per design, this page shows every unpaid fee up to one date */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <CalendarClock className="w-4 h-4 text-gray-400 shrink-0" />
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Show dues up to</label>
            <input
              type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
            />
          </div>
        </div>

        {/* Class-wise grouped list */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : !classGroups.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No pending fees as of this date</p>
          </div>
        ) : (
          <div className="space-y-4">
            {classGroups.map((g) => (
              <div key={g.class} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">Class {g.class}</p>
                  <p className="text-xs text-gray-500">
                    {g.students.length} student{g.students.length !== 1 ? 's' : ''} · <span className="font-semibold text-gray-800">{fmt(g.totalDue)}</span>
                  </p>
                </div>
                <div>
                  {g.students.map((s) => (
                    <StudentRow key={s.studentId} student={s} selectedDate={selectedDate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifyOpen && <NotifyClassTeachersPanel onClose={() => setNotifyOpen(false)} />}
    </div>
  );
}
