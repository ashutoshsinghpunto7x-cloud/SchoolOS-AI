import { useMemo, useState, useId, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Layers, Loader2, CalendarRange, Download } from 'lucide-react';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { studentsApi } from '@/features/students/api/students.api';
import { useClassAttendance, useClassAttendanceOverview } from '@/features/attendance/hooks/useAttendance';
import { attendanceApi } from '@/features/attendance/api/attendance.api';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { eventsApi } from '@/features/events/api/events.api';
import type { AttendanceStatus } from '@schoolos/types';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present:        'Present',
  absent:         'Absent',
  late:           'Late',
  half_day:       'Half Day',
  leave_approved: 'On Leave',
};

// Compact single/double-letter codes for the multi-date register grid — there
// isn't room for full words once a row has one column per day.
// 'H' is reserved for holidays on the range register (see nonSchoolReason) —
// half day uses 'Hf' so the two never look identical in the same grid.
const STATUS_CODE: Record<AttendanceStatus, string> = {
  present:        'P',
  absent:         'A',
  late:           'L',
  half_day:       'Hf',
  leave_approved: 'O',
};

// Local YYYY-MM-DD — see toLocalIsoDate below for why we don't use
// toISOString here (it shifts the date back a day in timezones ahead of
// UTC, like IST).
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type ClassRow = {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  status?: AttendanceStatus;
};

type ClassRegister = {
  cls: string;
  section: string;
  rows: ClassRow[];
  summary: Record<string, number>;
};

/** One row per student, one column per date, for date-range printing —
 *  built so a week/fortnight/month of attendance fits on one register page
 *  instead of a separate printout per day. */
type RangeRegister = {
  cls: string;
  section: string;
  dates: string[];
  /** Dates that aren't real school days — no attendance is expected on these,
   *  so the register prints "S"/"H" instead of whatever status (if any)
   *  happens to be on record. Sundays are computed locally; holidays come
   *  from the principal's published school-calendar events. */
  nonSchoolDates: Record<string, 'sunday' | 'holiday'>;
  rows: {
    studentId: string;
    fullName: string;
    admissionNumber: string;
    statuses: Record<string, AttendanceStatus | undefined>;
    presentDays: number;
  }[];
};

/** Sunday-or-published-holiday check for one date, used to both mark the
 *  register cell and to exclude the day from the working-days denominator
 *  behind the per-student attendance percentage. */
function nonSchoolReason(
  iso: string,
  holidayRanges: { startDate: string; endDate: string }[],
): 'sunday' | 'holiday' | undefined {
  const d = new Date(`${iso}T00:00:00`);
  if (!isNaN(d.getTime()) && d.getDay() === 0) return 'sunday';
  if (holidayRanges.some((h) => iso >= h.startDate && iso <= h.endDate)) return 'holiday';
  return undefined;
}

// Tuned for A4 *landscape* — a shorter page than portrait, so fewer rows fit
// per column; splitForColumns below adds a third column once two columns of
// this size still wouldn't be enough, instead of overflowing onto a second
// printed page.
const PRINT_ROWS_PER_COLUMN = 24;
const MAX_RANGE_DAYS = 31;

function splitForColumns<T>(rows: T[]): T[][] {
  if (rows.length <= PRINT_ROWS_PER_COLUMN) return [rows];
  const columns = rows.length <= PRINT_ROWS_PER_COLUMN * 2 ? 2 : 3;
  const perColumn = Math.ceil(rows.length / columns);
  const out: T[][] = [];
  for (let i = 0; i < columns; i++) {
    const chunk = rows.slice(i * perColumn, (i + 1) * perColumn);
    if (chunk.length) out.push(chunk);
  }
  return out;
}

/** Local YYYY-MM-DD — `toISOString` converts to UTC first, which silently
 *  shifts the date back a day in any timezone ahead of UTC (e.g. IST). */
function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive list of YYYY-MM-DD strings from `from` to `to`. */
function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(toLocalIsoDate(d));
  }
  return dates;
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function buildRows(
  students: { _id: string; fullName: string; admissionNumber: string }[],
  records: { studentId: string; status: AttendanceStatus }[] | undefined
): ClassRow[] {
  const statusByStudent = new Map<string, AttendanceStatus>();
  (records ?? []).forEach((r) => statusByStudent.set(r.studentId, r.status));
  return students
    .map((s) => ({
      studentId: s._id,
      fullName: s.fullName,
      admissionNumber: s.admissionNumber,
      status: statusByStudent.get(s._id),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function buildSummary(rows: ClassRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.status ?? 'unmarked';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

/** Reception-facing, print/PDF-friendly view of a single class's attendance —
 *  built for the front desk to keep an offline paper record, not to mark
 *  attendance (that stays teacher/admin/principal-only, server-enforced). */
export function ReceptionAttendancePage() {
  const navigate = useNavigate();
  const printAreaId = `reception-attendance-print-${useId().replace(/[:]/g, '')}`;
  const printAllAreaId = `reception-attendance-print-all-${useId().replace(/[:]/g, '')}`;
  const printRangeAreaId = `reception-attendance-print-range-${useId().replace(/[:]/g, '')}`;
  const prevTitleRef = useRef<string | null>(null);

  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState(todayStr());
  const [printing, setPrinting] = useState(false);

  const [allRegisters, setAllRegisters] = useState<ClassRegister[] | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);

  // Date-range register — a separate "To" date that, once it differs from
  // the single "date" above, lets the front desk print several days'
  // attendance for one class/section as one multi-column sheet instead of
  // running the single-day print once per day.
  const [toDate, setToDate] = useState(todayStr());
  const [rangeRegister, setRangeRegister] = useState<RangeRegister | null>(null);
  const [generatingRange, setGeneratingRange] = useState(false);
  const [printingRange, setPrintingRange] = useState(false);
  const isRange = toDate > date;
  const rangeDates = useMemo(() => (isRange ? datesBetween(date, toDate) : []), [isRange, date, toDate]);

  const { data: classes, isLoading: classesLoading } = useSchoolClasses();
  const { data: schoolSettings } = useSchoolSettings();

  // "Class & Section Overview" — every class/section for the selected date,
  // with its own one-click Download so the front desk doesn't have to work
  // through the Class/Section pickers above one at a time. Reuses the same
  // per-class-teacher summary shown on the admin Attendance workspace.
  const { data: overview, isLoading: overviewLoading } = useClassAttendanceOverview(date);
  const [pendingDownload, setPendingDownload] = useState<{ cls: string; section: string } | null>(null);

  const sections = useMemo(
    () => classes?.find((c) => c.name === cls)?.sections ?? [],
    [classes, cls]
  );

  const { data: studentsPage, isLoading: studentsLoading } = useStudentsPaginated({
    class: cls || undefined,
    section: section || undefined,
    limit: 200,
    status: 'active',
  });
  const students = studentsPage?.data ?? [];

  const { data: records, isLoading: recordsLoading } = useClassAttendance(cls, section, date);

  const statusByStudent = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    (records ?? []).forEach((r) => map.set(r.studentId, r.status));
    return map;
  }, [records]);

  const rows = useMemo(
    () =>
      students
        .map((s) => ({
          studentId: s._id,
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          status: statusByStudent.get(s._id),
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students, statusByStudent]
  );

  const summary = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.status ?? 'unmarked';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Print only: a class register long enough to run past one A4 column (rough
  // estimate for the compact print font/row-height below) is split into two
  // columns side by side on the same sheet instead of spilling onto a second
  // printed page. Short lists print as a single column, same as the screen view.
  const splitForPrint = rows.length > PRINT_ROWS_PER_COLUMN;
  const printColumns = splitForColumns(rows);
  const printColumnSizes = printColumns.map((c) => c.length);

  const ready = !!cls && !!section;
  const loading = classesLoading || (ready && (studentsLoading || recordsLoading));

  // Fires once the class/section picked from the overview table below has
  // finished loading its students/attendance — printing immediately on click
  // would race the queries that only start once cls/section are set.
  useEffect(() => {
    if (!pendingDownload) return;
    if (cls !== pendingDownload.cls || section !== pendingDownload.section) return;
    if (loading) return;
    setPendingDownload(null);
    if (rows.length > 0) setPrinting(true);
    else window.alert(`No students found for Class ${pendingDownload.cls} / ${pendingDownload.section}.`);
  }, [pendingDownload, cls, section, loading, rows.length]);

  function downloadClassSection(clsName: string, sectionName: string) {
    setCls(clsName);
    setSection(sectionName);
    setPendingDownload({ cls: clsName, section: sectionName });
  }

  const activePrintAreaId = printingRange ? printRangeAreaId : printingAll ? printAllAreaId : printAreaId;

  // Browser print sets its own header/footer (date, page title, URL, page
  // number) outside the page's control — CSS can't remove it, only the
  // browser's own print dialog can ("More settings" → uncheck "Headers and
  // footers"). The best the app can do is make the title meaningful while a
  // print is in flight, instead of leaving it on whatever page was last
  // titled (e.g. "Sign In").
  useEffect(() => {
    if (!printing && !printingAll && !printingRange) return;
    prevTitleRef.current = document.title;
    document.title = printingRange
      ? `${schoolSettings?.schoolName ?? 'School'} — Attendance — Class ${cls} ${section} — ${date} to ${toDate}`
      : printingAll
      ? `${schoolSettings?.schoolName ?? 'School'} — Attendance — All Classes — ${date}`
      : `${schoolSettings?.schoolName ?? 'School'} — Attendance — Class ${cls} ${section} — ${date}`;
    return () => {
      if (prevTitleRef.current !== null) document.title = prevTitleRef.current;
    };
  }, [printing, printingAll, printingRange, schoolSettings?.schoolName, cls, section, date, toDate]);

  useEffect(() => {
    if (!printing && !printingAll && !printingRange) return;
    const reset = () => {
      setPrinting(false);
      setPrintingAll(false);
      setPrintingRange(false);
      window.removeEventListener('afterprint', reset);
    };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('afterprint', reset); };
  }, [printing, printingAll, printingRange]);

  async function handleGenerateRange() {
    if (!ready || generatingRange || rangeDates.length === 0) return;
    if (rangeDates.length > MAX_RANGE_DAYS) {
      window.alert(`Pick a range of at most ${MAX_RANGE_DAYS} days.`);
      return;
    }
    setGeneratingRange(true);
    try {
      const studentsRes = await studentsApi.listPaginated({ class: cls, section, limit: 200, status: 'active' });
      const rangeStudents = (studentsRes.data ?? []).slice().sort((a, b) => a.fullName.localeCompare(b.fullName));
      if (rangeStudents.length === 0) {
        window.alert('No students found in this class/section.');
        return;
      }
      const [perDateRecords, holidaysRes] = await Promise.all([
        Promise.all(rangeDates.map((d) => attendanceApi.getClassAttendance(cls, section, d))),
        // Published holidays overlapping the range — startFrom/startTo only
        // filters on the event's own start date, so widen the lower bound to
        // also catch a multi-day holiday that started before the range.
        eventsApi.list({
          eventType: 'holiday', status: 'published', limit: 200,
          startFrom: toLocalIsoDate(new Date(new Date(`${date}T00:00:00`).getTime() - 90 * 86400000)),
          startTo: toDate,
        }),
      ]);
      const holidayRanges = holidaysRes.data
        .map((e) => ({ startDate: e.startDate.split('T')[0], endDate: e.endDate.split('T')[0] }))
        .filter((h) => h.endDate >= rangeDates[0]);
      const nonSchoolDates: Record<string, 'sunday' | 'holiday'> = {};
      rangeDates.forEach((d) => {
        const reason = nonSchoolReason(d, holidayRanges);
        if (reason) nonSchoolDates[d] = reason;
      });
      const rows = rangeStudents.map((s) => {
        const statuses: Record<string, AttendanceStatus | undefined> = {};
        let presentDays = 0;
        rangeDates.forEach((d, i) => {
          const rec = perDateRecords[i]?.find((r) => r.studentId === s._id);
          statuses[d] = rec?.status;
          if (rec?.status === 'present') presentDays += 1;
        });
        return { studentId: s._id, fullName: s.fullName, admissionNumber: s.admissionNumber, statuses, presentDays };
      });
      setRangeRegister({ cls, section, dates: rangeDates, nonSchoolDates, rows });
      setPrintingRange(true);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to generate the date-range register.');
    } finally {
      setGeneratingRange(false);
    }
  }

  async function handleGenerateAll() {
    if (!classes || classes.length === 0 || generatingAll) return;
    setGeneratingAll(true);
    try {
      const targets = classes.flatMap((c) => c.sections.map((s) => ({ cls: c.name, section: s })));
      const registers: ClassRegister[] = [];
      for (const t of targets) {
        const [studentsRes, recordsRes] = await Promise.all([
          studentsApi.listPaginated({ class: t.cls, section: t.section, limit: 200, status: 'active' }),
          attendanceApi.getClassAttendance(t.cls, t.section, date),
        ]);
        const classRows = buildRows(studentsRes.data ?? [], recordsRes);
        if (classRows.length === 0) continue; // skip empty sections
        registers.push({ cls: t.cls, section: t.section, rows: classRows, summary: buildSummary(classRows) });
      }
      if (registers.length === 0) {
        window.alert('No students found in any class/section for this date.');
        return;
      }
      setAllRegisters(registers);
      setPrintingAll(true);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to generate attendance for all classes.');
    } finally {
      setGeneratingAll(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      {(printing || printingAll || printingRange) && (
        <style>{`
          /* Every register prints landscape — the wider sheet gives the
             two-column split (and the range register's one-column-per-date
             grid) room to use the full page instead of leaving a narrow
             printed strip down a tall portrait sheet. */
          @page { size: A4 landscape; margin: 12mm; }
          @media print {
            body * { visibility: hidden; }
            #${activePrintAreaId}, #${activePrintAreaId} * { visibility: visible; }
            #${activePrintAreaId} { position: absolute; top: 0; left: 0; width: 100%; }
          }
        `}</style>
      )}

      <div className="print:hidden flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/reception')}
          className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Class Attendance Records</h1>
          <p className="text-sm text-gray-500">View, print, or save a class's attendance as a PDF for offline records</p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="print:hidden bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Class</label>
          <select
            value={cls}
            onChange={(e) => { setCls(e.target.value); setSection(''); }}
            className="h-10 min-w-[140px] px-3 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="">Select class</option>
            {(classes ?? []).map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            disabled={!cls}
            className="h-10 min-w-[120px] px-3 rounded-lg border border-gray-200 text-sm bg-white disabled:opacity-50"
          >
            <option value="">Select section</option>
            {sections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Date{isRange ? ' (from)' : ''}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (toDate < e.target.value) setToDate(e.target.value);
            }}
            max={todayStr()}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To (optional)</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={date}
            max={todayStr()}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm"
            title="Pick a later date to print several days' attendance as one register"
          />
        </div>
        {isRange ? (
          <button
            type="button"
            onClick={handleGenerateRange}
            disabled={!ready || generatingRange || rangeDates.length === 0}
            className="h-10 px-4 rounded-lg bg-[#1C2B4A] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
            title={`Print attendance for ${date} to ${toDate} (${rangeDates.length} day${rangeDates.length === 1 ? '' : 's'}) as one register`}
          >
            {generatingRange ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
            Print Range ({rangeDates.length}d)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPrinting(true)}
            disabled={!ready || loading || rows.length === 0}
            className="h-10 px-4 rounded-lg bg-[#1C2B4A] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        )}
        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={classesLoading || generatingAll || !classes?.length}
          className="h-10 px-4 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
          title="Print every class and section's attendance for the selected date, one register per page"
        >
          {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
          Generate All
        </button>
        {isRange && (
          <p className="w-full text-xs text-gray-400">
            {rangeDates.length} day register for Class {cls || '—'} {section}. In the print dialog, turn on
            "Print on both sides" (duplex) to keep it to fewer sheets of paper — this app can't set that for you.
          </p>
        )}
      </div>

      {/* ── Class & Section Overview ───────────────────────────────────────
          Every class/section for the selected date, ready to download in one
          click — no need to work through the Class/Section pickers above per
          class. Mirrors the per-class-teacher summary the admin dashboard
          already shows for today's attendance. */}
      <div className="print:hidden bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <p className="text-sm font-bold text-gray-900 mb-1">All Classes &amp; Sections — {date}</p>
        <p className="text-xs text-gray-500 mb-3">Every class/section with students, ready to download.</p>
        {overviewLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded-lg" />)}
          </div>
        ) : !overview || overview.classes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No classes with students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">Section</th>
                  <th className="py-2 pr-3">Class Teacher</th>
                  <th className="py-2 pr-3">Students</th>
                  <th className="py-2 pr-3">Present</th>
                  <th className="py-2 pr-3">Absent</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {overview.classes.map((row) => {
                  const isPending = pendingDownload?.cls === row.class && pendingDownload?.section === row.section;
                  return (
                    <tr key={`${row.class}-${row.section}`} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium text-gray-900">{row.class}</td>
                      <td className="py-2 pr-3 text-gray-700">{row.section}</td>
                      <td className="py-2 pr-3 text-gray-600">{row.classTeacherName ?? '—'}</td>
                      <td className="py-2 pr-3 text-gray-700">{row.totalStudents}</td>
                      <td className="py-2 pr-3 text-emerald-700">{row.present}</td>
                      <td className="py-2 pr-3 text-red-600">{row.absent}</td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => downloadClassSection(row.class, row.section)}
                          disabled={isPending}
                          className="h-8 px-3 rounded-lg bg-white border border-gray-300 text-gray-800 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 ml-auto"
                        >
                          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Records ─────────────────────────────────────────────────────── */}
      <div id={printAreaId} className="bg-white rounded-xl border border-gray-200 p-5" style={{ minHeight: '50vh' }}>
        {!ready ? (
          <div className="text-center py-16 text-gray-400 text-sm">Select a class and section to view attendance.</div>
        ) : loading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No students found for this class/section.</div>
        ) : (
          <>
            {/* Print header — hidden on screen, shown on paper */}
            <div className="hidden print:block mb-4">
              <p className="text-base font-bold text-gray-900">{schoolSettings?.schoolName ?? 'School'}</p>
              <p className="text-sm text-gray-700">Attendance — Class {cls} / {section} — {date}</p>
            </div>
            <div className="print:hidden mb-3">
              <p className="text-sm font-bold text-gray-900">Class {cls} / {section} — {date}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {rows.length} students · {summary.present ?? 0} present · {summary.absent ?? 0} absent ·{' '}
                {summary.late ?? 0} late · {summary.half_day ?? 0} half day · {summary.leave_approved ?? 0} on leave
                {summary.unmarked ? ` · ${summary.unmarked} unmarked` : ''}
              </p>
            </div>

            {/* Screen table — unchanged: admission no. included, single column.
                Hidden on paper when the print version below takes over. */}
            <table className={`w-full text-sm ${splitForPrint ? 'print:hidden' : ''}`}>
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 w-10">#</th>
                  <th className="py-2 pr-3 print:hidden">Admission No.</th>
                  <th className="py-2 pr-3">Student Name</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.studentId} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-3 text-gray-600 print:hidden">{r.admissionNumber}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{r.fullName}</td>
                    <td className="py-2 pr-3 text-gray-700">{r.status ? STATUS_LABEL[r.status] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Print-only, two-column register — kicks in once the class is too
                long for one A4 column. No admission no.; name + status only. */}
            {splitForPrint && (
              <div className={`hidden print:grid print:gap-6 ${printColumns.length === 3 ? 'print:grid-cols-3' : 'print:grid-cols-2'}`}>
                {printColumns.map((chunk, colIdx) => {
                  const offset = printColumnSizes.slice(0, colIdx).reduce((a, b) => a + b, 0);
                  return (
                    <table key={colIdx} className="w-full text-xs">
                      <thead>
                        <tr className="text-left font-semibold text-gray-500 border-b border-gray-300">
                          <th className="py-1 pr-2 w-8">#</th>
                          <th className="py-1 pr-2">Student Name</th>
                          <th className="py-1 pr-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.map((r, i) => (
                          <tr key={r.studentId} className="border-b border-gray-100">
                            <td className="py-1 pr-2 text-gray-500">{offset + i + 1}</td>
                            <td className="py-1 pr-2 font-medium text-gray-900">{r.fullName}</td>
                            <td className="py-1 pr-2 text-gray-700">{r.status ? STATUS_LABEL[r.status] : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })}
              </div>
            )}

            {/* Print-only footer totals — just the three numbers asked for on
                paper (full status breakdown stays screen-only, above). */}
            <div className="hidden print:flex print:items-center print:gap-6 mt-4 pt-2 border-t border-gray-300 text-xs font-semibold text-gray-900">
              <span>Total Students: {rows.length}</span>
              <span>Present: {summary.present ?? 0}</span>
              <span>Absent: {summary.absent ?? 0}</span>
            </div>
          </>
        )}
        {loading && ready && <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto mt-4 print:hidden" />}
      </div>

      {/* Print-all area: one register per class/section, each on its own
          printed page. Only rendered (and only made visible) once "Generate
          All" has fetched every class's attendance for the selected date. */}
      {printingAll && allRegisters && (
        <div id={printAllAreaId} className="hidden print:block">
          {allRegisters.map((reg, idx) => {
            const regSplit = reg.rows.length > PRINT_ROWS_PER_COLUMN;
            const regColumns = splitForColumns(reg.rows);
            const regColumnSizes = regColumns.map((c) => c.length);
            return (
              <div key={`${reg.cls}-${reg.section}`} style={idx > 0 ? { pageBreakBefore: 'always' } : undefined}>
                <div className="mb-4">
                  <p className="text-base font-bold text-gray-900">{schoolSettings?.schoolName ?? 'School'}</p>
                  <p className="text-sm text-gray-700">Attendance — Class {reg.cls} / {reg.section} — {date}</p>
                </div>

                {regSplit ? (
                  <div className={`grid gap-6 ${regColumns.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {regColumns.map((chunk, colIdx) => {
                      const offset = regColumnSizes.slice(0, colIdx).reduce((a, b) => a + b, 0);
                      return (
                        <table key={colIdx} className="w-full text-xs">
                          <thead>
                            <tr className="text-left font-semibold text-gray-500 border-b border-gray-300">
                              <th className="py-1 pr-2 w-8">#</th>
                              <th className="py-1 pr-2">Student Name</th>
                              <th className="py-1 pr-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunk.map((r, i) => (
                              <tr key={r.studentId} className="border-b border-gray-100">
                                <td className="py-1 pr-2 text-gray-500">{offset + i + 1}</td>
                                <td className="py-1 pr-2 font-medium text-gray-900">{r.fullName}</td>
                                <td className="py-1 pr-2 text-gray-700">{r.status ? STATUS_LABEL[r.status] : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-3 w-10">#</th>
                        <th className="py-2 pr-3">Student Name</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reg.rows.map((r, i) => (
                        <tr key={r.studentId} className="border-b border-gray-100">
                          <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
                          <td className="py-2 pr-3 font-medium text-gray-900">{r.fullName}</td>
                          <td className="py-2 pr-3 text-gray-700">{r.status ? STATUS_LABEL[r.status] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="flex items-center gap-6 mt-4 pt-2 border-t border-gray-300 text-xs font-semibold text-gray-900">
                  <span>Total Students: {reg.rows.length}</span>
                  <span>Present: {reg.summary.present ?? 0}</span>
                  <span>Absent: {reg.summary.absent ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print-only date-range register: one row per student, one column per
          date, so N days of attendance print as a single sheet (landscape)
          instead of N separate single-day printouts. */}
      {printingRange && rangeRegister && (() => {
        const workingDays = rangeRegister.dates.length - Object.keys(rangeRegister.nonSchoolDates).length;
        return (
        <div id={printRangeAreaId} className="hidden print:block">
          <div className="mb-4">
            <p className="text-base font-bold text-gray-900">{schoolSettings?.schoolName ?? 'School'}</p>
            <p className="text-sm text-gray-700">
              Attendance — Class {rangeRegister.cls} / {rangeRegister.section} — {shortDate(rangeRegister.dates[0])} to{' '}
              {shortDate(rangeRegister.dates[rangeRegister.dates.length - 1])} — {workingDays} working day{workingDays === 1 ? '' : 's'}
              {' '}of {rangeRegister.dates.length}
            </p>
          </div>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="text-left font-semibold text-gray-500 border-b border-gray-300">
                <th className="py-1 pr-2 w-8">#</th>
                <th className="py-1 pr-2 min-w-[110px]">Student Name</th>
                {rangeRegister.dates.map((d) => (
                  <th key={d} className="py-1 px-1 text-center whitespace-nowrap">{shortDate(d)}</th>
                ))}
                <th className="py-1 px-1 text-center whitespace-nowrap border-l border-gray-300">P.D</th>
                <th className="py-1 px-1 text-center whitespace-nowrap">%</th>
              </tr>
            </thead>
            <tbody>
              {rangeRegister.rows.map((r, i) => {
                const percent = workingDays > 0 ? Math.round((r.presentDays / workingDays) * 100) : 0;
                return (
                  <tr key={r.studentId} className="border-b border-gray-100">
                    <td className="py-1 pr-2 text-gray-500">{i + 1}</td>
                    <td className="py-1 pr-2 font-medium text-gray-900 whitespace-nowrap">{r.fullName}</td>
                    {rangeRegister.dates.map((d) => {
                      const nonSchool = rangeRegister.nonSchoolDates[d];
                      const code = nonSchool ? (nonSchool === 'sunday' ? 'S' : 'H') : (r.statuses[d] ? STATUS_CODE[r.statuses[d]!] : '—');
                      return (
                        <td key={d} className="py-1 px-1 text-center text-gray-700">{code}</td>
                      );
                    })}
                    <td className="py-1 px-1 text-center font-semibold text-gray-900 border-l border-gray-300">{r.presentDays}</td>
                    <td className="py-1 px-1 text-center font-semibold text-gray-900">{percent}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-300 text-[10px] font-semibold text-gray-900 flex-wrap">
            <span>Total Students: {rangeRegister.rows.length}</span>
            <span>P.D = Present Days</span>
            <span>% = Attendance % (of {workingDays} working days)</span>
            <span>P = Present</span>
            <span>A = Absent</span>
            <span>L = Late</span>
            <span>Hf = Half Day</span>
            <span>O = On Leave</span>
            <span>S = Sunday</span>
            <span>H = Holiday</span>
            <span>— = Unmarked</span>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
