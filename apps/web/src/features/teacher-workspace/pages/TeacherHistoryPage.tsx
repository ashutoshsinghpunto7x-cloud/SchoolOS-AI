import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  ChevronRight,
  Filter,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { attendanceApi } from '@/features/attendance/api/attendance.api';
import { studentsApi } from '@/features/students/api/students.api';
import type { Attendance } from '@schoolos/types';
import { cn } from '@/lib/utils';
import attendanceTopIllustration from '@/assets/illustrations/teacher/Attendance-Top.png';

// ── Utilities ─────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 7 calendar days including today, e.g. today=16th -> 10th..16th. */
function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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
  markedAt?: string;
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
        markedAt: r.markedAt,
      });
    }
    const g = map.get(key)!;
    g.records.push(r);
    g.totalCount++;
    if (r.status === 'present') g.presentCount++;
    else if (r.status === 'absent') g.absentCount++;
    // Earliest mark time for the session represents "when attendance was taken".
    if (r.markedAt && (!g.markedAt || r.markedAt < g.markedAt)) g.markedAt = r.markedAt;
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Date badge — weekday / day number / month, matching the reference design ──
// Rotates through a few accent hues by weekday so the list reads with the
// same colorful-left-bar language as the dark theme reference design.
const DAY_ACCENTS = [
  { bar: 'bg-[#DB2777]', tint: 'bg-[#DB2777]/10 dark:bg-[#DB2777]/15' }, // Sun
  { bar: 'bg-[#6D4AFF]', tint: 'bg-[#6D4AFF]/10 dark:bg-[#6D4AFF]/15' }, // Mon
  { bar: 'bg-[#4A90FF]', tint: 'bg-[#4A90FF]/10 dark:bg-[#4A90FF]/15' }, // Tue
  { bar: 'bg-[#20C997]', tint: 'bg-[#20C997]/10 dark:bg-[#20C997]/15' }, // Wed
  { bar: 'bg-[#4A90FF]', tint: 'bg-[#4A90FF]/10 dark:bg-[#4A90FF]/15' }, // Thu
  { bar: 'bg-[#20C997]', tint: 'bg-[#20C997]/10 dark:bg-[#20C997]/15' }, // Fri
  { bar: 'bg-[#FFB547]', tint: 'bg-[#FFB547]/10 dark:bg-[#FFB547]/15' }, // Sat
];

function DateBadge({ date }: { date: string }) {
  const d = new Date(date + 'T00:00:00');
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  const accent = DAY_ACCENTS[d.getDay()];
  return (
    <div className={cn('w-16 shrink-0 rounded-xl px-1 py-2.5 text-center', accent.tint)}>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-white/50 tracking-wide">{weekday}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{day}</p>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-white/50">{month}</p>
    </div>
  );
}

// ── DayCard — one row per calendar day: either a marked session or "No attendance taken" ──

function DayCard({ date, session, studentNames }: { date: string; session?: SessionGroup; studentNames: Map<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const accent = DAY_ACCENTS[new Date(date + 'T00:00:00').getDay()];

  if (!session) {
    return (
      <div className={cn('relative flex items-center gap-3 bg-white dark:bg-white/[0.04] dark:backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-none px-3 py-3 overflow-hidden')}>
        <span className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl', accent.bar)} />
        <DateBadge date={date} />
        <p className="flex-1 text-sm text-gray-400 dark:text-white/40">No attendance taken</p>
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />
      </div>
    );
  }

  const time = fmtTime(session.markedAt);

  return (
    <div className="relative bg-white dark:bg-white/[0.04] dark:backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden">
      <span className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl z-10', accent.bar)} />
      <button type="button" onClick={() => setExpanded((p) => !p)} className="w-full text-left flex items-center gap-3 px-3 py-3">
        <DateBadge date={date} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Class {session.cls} – {session.section}</p>
          {time && (
            <p className="text-xs text-gray-500 dark:text-white/50 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-[#A855F7]" /> {time}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {session.presentCount} Present
            </span>
            <span className="text-xs font-semibold text-red-500 dark:text-red-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {session.absentCount} Absent
            </span>
          </div>
        </div>
        <ChevronRight className={cn('w-4 h-4 text-gray-300 dark:text-white/20 shrink-0 transition-transform', expanded && 'rotate-90')} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/10">
          {session.records.map((r, i) => {
            const statusMap: Record<string, { label: string; cls: string }> = {
              present:        { label: 'P',  cls: 'bg-emerald-100 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300' },
              absent:         { label: 'A',  cls: 'bg-red-100 dark:bg-red-400/15 text-red-600 dark:text-red-300'        },
              late:           { label: 'L',  cls: 'bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300'    },
              half_day:       { label: 'H',  cls: 'bg-orange-100 dark:bg-orange-400/15 text-orange-700 dark:text-orange-300'  },
              leave_approved: { label: 'LV', cls: 'bg-blue-100 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300'      },
            };
            const s = statusMap[r.status] ?? { label: r.status, cls: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60' };
            return (
              <div key={r._id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-white/5 last:border-0">
                <span className="text-xs text-gray-400 dark:text-white/30 w-5 text-right shrink-0">{i + 1}</span>
                <p className="flex-1 text-sm text-gray-700 dark:text-white/80 truncate">
                  {studentNames.get(r.studentId) ?? r.studentId}
                </p>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', s.cls)}>{s.label}</span>
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
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo());
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [search,   setSearch]   = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

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

  // Attendance records only carry studentId — look up each roster once to
  // resolve names for the expanded per-student rows (matches how the
  // marking page shows names via the same students API).
  const { data: studentNames } = useQuery({
    queryKey: ['teacher-history-student-names', classPairs.map((p) => `${p.cls}|${p.section}`), selectedClass],
    queryFn: async (): Promise<Map<string, string>> => {
      const targets = selectedPair ? [selectedPair] : classPairs;
      const results = await Promise.all(
        targets.map((p) => studentsApi.listPaginated({ class: p.cls, section: p.section, limit: 300 })),
      );
      const map = new Map<string, string>();
      for (const r of results) for (const s of r.data) map.set(s._id, s.fullName);
      return map;
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

  // Every calendar day in the selected range, most recent first — not just
  // the days a session happens to exist for, so days with nothing marked
  // still show up as "No attendance taken" (matching the reference design).
  // Capped at 62 days so an accidentally huge custom range doesn't render
  // hundreds of empty rows.
  const calendarDays = useMemo(() => {
    const start = new Date(dateFrom + 'T00:00:00');
    const end = new Date(dateTo + 'T00:00:00');
    const days: string[] = [];
    for (let d = new Date(end); d >= start && days.length < 62; d.setDate(d.getDate() - 1)) {
      days.push(toDateStr(d));
    }
    return days;
  }, [dateFrom, dateTo]);

  const dayEntries = useMemo(() => {
    const bySessionDate = new Map<string, SessionGroup[]>();
    for (const s of sessions) {
      const arr = bySessionDate.get(s.date) ?? [];
      arr.push(s);
      bySessionDate.set(s.date, arr);
    }
    const entries: { date: string; session?: SessionGroup }[] = [];
    for (const date of calendarDays) {
      const daySessions = bySessionDate.get(date);
      if (daySessions?.length) {
        for (const s of daySessions) entries.push({ date, session: s });
      } else {
        entries.push({ date });
      }
    }
    return entries;
  }, [calendarDays, sessions]);

  const isDefaultRange = dateFrom === sevenDaysAgo() && dateTo === todayStr();
  const rangeLabel = isDefaultRange
    ? 'Last 7 Days'
    : `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(dateTo + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0C12]">
      {/* Header — unchanged */}
      <div className="bg-white dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/10 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors mb-3 -ml-1 p-1"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Attendance History</h1>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">Review past attendance sessions</p>
          </div>
          {/* The source PNG is a transparent canvas where the clipboard+clock
              glyph only fills roughly the middle third of the square (large
              invisible padding on every side) — so a plain resize looked
              tiny no matter the display size. Fix: crop/zoom into the
              glyph's actual bounding box (measured pixel-for-pixel from the
              source file) via an oversized, absolutely-positioned <img>
              inside a clipped wrapper, instead of shrinking the whole
              canvas. Sized up a step further on sm+ screens. */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 overflow-hidden shrink-0">
            <img
              src={attendanceTopIllustration}
              alt=""
              className="absolute max-w-none w-[96px] h-[143px] left-[-22px] top-[-31px] sm:w-[120px] sm:h-[179px] sm:left-[-27px] sm:top-[-39px] select-none pointer-events-none"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* "Last 7 Days" / Filter row — the standalone "Filter by Date" button
          that used to float above the bottom nav was redundant with this
          toggle (both opened the same panel), so it's gone; this icon is now
          the only way in, in the same spot the "Calendar" pill used to be. */}
      <div className="px-4 pt-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{rangeLabel}</h2>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          aria-label="Filter by date"
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#5B21B6] dark:text-violet-300 bg-[#A855F7]/10 dark:bg-[#A855F7]/15 hover:bg-[#A855F7]/20 dark:hover:bg-[#A855F7]/25 transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {filterOpen && (
        <div className="px-4 pt-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by class or date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] transition-colors"
            />
          </div>

          {/* Class filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30 pointer-events-none" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 pl-9 pr-3 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] appearance-none transition-colors"
            >
              <option value="" className="dark:bg-[#181B26]">All My Classes</option>
              {classPairs.map((p) => (
                <option key={`${p.cls}||${p.section}`} value={`${p.cls}||${p.section}`} className="dark:bg-[#181B26]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 h-11 px-3 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-white [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] transition-colors"
            />
            <span className="text-gray-400 dark:text-white/30 text-sm shrink-0">to</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={todayStr()}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 h-11 px-3 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-white [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 focus:border-[#5B21B6] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Day list — pb-24 clears the teacher portal's persistent bottom nav. */}
      <div className="px-4 pt-4 pb-24 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-100 dark:border-white/10 h-20 animate-pulse" />
          ))
        ) : isError ? (
          <div className="bg-red-50 dark:bg-red-400/10 border border-red-100 dark:border-red-400/20 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Failed to load history</p>
          </div>
        ) : dayEntries.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-100 dark:border-white/10 p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-gray-400 dark:text-white/40" />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-white/80">No attendance records found</p>
            <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Try adjusting the date range or class filter.</p>
          </div>
        ) : (
          dayEntries.map((entry, i) => (
            <DayCard
              key={`${entry.date}|${entry.session?.cls ?? ''}|${entry.session?.section ?? ''}|${i}`}
              date={entry.date}
              session={entry.session}
              studentNames={studentNames ?? new Map()}
            />
          ))
        )}
      </div>

    </div>
  );
}
