import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Filter,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { attendanceApi } from '@/features/attendance/api/attendance.api';
import type { Attendance } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── SessionGroup: grouped attendance records per class per date ───────────────

interface SessionGroup {
  date: string;
  cls: string;
  section: string;
  records: Attendance[];
  presentCount: number;
  absentCount: number;
  totalCount: number;
}

function groupBySession(records: Attendance[]): SessionGroup[] {
  const map = new Map<string, SessionGroup>();
  for (const r of records) {
    const dateStr = r.date?.toString().slice(0, 10) ?? '';
    const key = `${dateStr}|${r.class}|${r.section}`;
    if (!map.has(key)) {
      map.set(key, {
        date: dateStr,
        cls: r.class,
        section: r.section,
        records: [],
        presentCount: 0,
        absentCount: 0,
        totalCount: 0,
      });
    }
    const g = map.get(key)!;
    g.records.push(r);
    g.totalCount++;
    if (r.status === 'present') g.presentCount++;
    else if (r.status === 'absent') g.absentCount++;
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// ── SessionCard ───────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: SessionGroup }) {
  const [expanded, setExpanded] = useState(false);
  const pct = session.totalCount > 0
    ? Math.round((session.presentCount / session.totalCount) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Date icon */}
          <div className="w-10 h-10 bg-[#A855F7]/10 rounded-xl flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-[#5B21B6]" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">
              Class {session.cls} – {session.section}
            </p>
            <p className="text-xs text-gray-500">{fmtDate(session.date)}</p>
          </div>

          {/* Stats chips */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              {session.presentCount}P
            </span>
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
              {session.absentCount}A
            </span>
            <span className="text-xs font-semibold text-gray-500">
              {pct}%
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </button>

      {/* Expanded student list */}
      {expanded && (
        <div className="border-t border-gray-100">
          {session.records.map((r, i) => {
            const statusMap: Record<string, { label: string; cls: string }> = {
              present:        { label: 'P',  cls: 'bg-emerald-100 text-emerald-700' },
              absent:         { label: 'A',  cls: 'bg-red-100 text-red-600'        },
              late:           { label: 'L',  cls: 'bg-amber-100 text-amber-700'    },
              half_day:       { label: 'H',  cls: 'bg-orange-100 text-orange-700'  },
              leave_approved: { label: 'LV', cls: 'bg-blue-100 text-blue-700'      },
            };
            const s = statusMap[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
            return (
              <div
                key={r._id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                <p className="flex-1 text-sm text-gray-700 truncate">
                  {(r as unknown as { studentName?: string }).studentName ?? r.studentId}
                </p>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', s.cls)}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TeacherHistoryPage() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo());
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [search,   setSearch]   = useState('');

  const { data: workspace } = useTeacherWorkspace();

  // Only classes this teacher is the assigned class teacher for — attendance
  // can only ever be marked for those, so history is scoped the same way.
  const classPairs = useMemo(() => {
    if (!workspace) return [];
    return (workspace.classTeacherOf ?? [])
      .map((c) => ({ cls: c.class, section: c.section, label: `${c.class} – ${c.section}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [workspace]);

  const [selectedClass, setSelectedClass] = useState('');

  const selectedPair = classPairs.find((p) => `${p.cls}||${p.section}` === selectedClass);

  // When no specific class is picked, merge history across every class this
  // teacher is the assigned class teacher for — never school-wide, since a
  // teacher should only ever see attendance history for their own classes.
  const { data: mergedRecords, isLoading, isError } = useQuery({
    queryKey: ['teacher-attendance-history', classPairs.map((p) => `${p.cls}|${p.section}`), selectedClass, dateFrom, dateTo],
    queryFn: async (): Promise<Attendance[]> => {
      const targets = selectedPair ? [selectedPair] : classPairs;
      const results = await Promise.all(
        targets.map((p) => attendanceApi.list({ class: p.cls, section: p.section, dateFrom, dateTo, limit: 500 })),
      );
      return results.flatMap((r) => r.data);
    },
    enabled: classPairs.length > 0,
  });

  const sessions = useMemo(() => {
    const records = mergedRecords ?? [];
    const grouped = groupBySession(records);
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter(
      (s) =>
        `${s.cls} ${s.section}`.toLowerCase().includes(q) ||
        s.date.includes(q),
    );
  }, [mergedRecords, search]);

  const totalMarked = sessions.length;
  const totalStudents = sessions.reduce((s, g) => s + g.totalCount, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-3 -ml-1 p-1"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance History</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review past attendance sessions</p>

        {/* Stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-[#A855F7]/5 border border-[#A855F7]/20 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold text-[#5B21B6]">{totalMarked}</p>
            <p className="text-xs text-[#5B21B6]/80 font-medium">Sessions</p>
          </div>
          <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold text-gray-700">{totalStudents}</p>
            <p className="text-xs text-gray-500 font-medium">Records</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by class or date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] transition-colors"
          />
        </div>

        {/* Class filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] appearance-none transition-colors"
            >
              <option value="">All My Classes</option>
              {classPairs.map((p) => (
                <option key={`${p.cls}||${p.section}`} value={`${p.cls}||${p.section}`}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range */}
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] transition-colors"
          />
          <span className="text-gray-400 text-sm shrink-0">to</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={todayStr()}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] transition-colors"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="px-4 pb-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 animate-pulse" />
          ))
        ) : isError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load history</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">No attendance records found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting the date range or class filter.</p>
          </div>
        ) : (
          sessions.map((s) => (
            <SessionCard key={`${s.date}|${s.cls}|${s.section}`} session={s} />
          ))
        )}
      </div>
    </div>
  );
}
