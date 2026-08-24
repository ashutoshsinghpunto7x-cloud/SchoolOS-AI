import { useMemo, useState, useId, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Layers, Loader2, CalendarRange } from 'lucide-react';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { studentsApi } from '@/features/students/api/students.api';
import { useClassAttendance } from '@/features/attendance/hooks/useAttendance';
import { attendanceApi } from '@/features/attendance/api/attendance.api';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
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
const STATUS_CODE: Record<AttendanceStatus, string> = {
  present:        'P',
  absent:         'A',
  late:           'L',
  half_day:       'H',
  leave_approved: 'O',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
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
  rows: {
    studentId: string;
    fullName: string;
    admissionNumber: string;
    statuses: Record<string, AttendanceStatus | undefined>;
  }[];
};

const PRINT_ROWS_PER_COLUMN = 32;
const MAX_RANGE_DAYS = 31;

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
  const printHalf = Math.ceil(rows.length / 2);
  const printColumns = splitForPrint
    ? [rows.slice(0, printHalf), rows.slice(printHalf)]
    : [rows];

  const ready = !!cls && !!section;
  const loading = classesLoading || (ready && (studentsLoading || recordsLoading));

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
      const perDateRecords = await Promise.all(
        rangeDates.map((d) => attendanceApi.getClassAttendance(cls, section, d)),
      );
      const rows = rangeStudents.map((s) => {
        const statuses: Record<string, AttendanceStatus | undefined> = {};
        rangeDates.forEach((d, i) => {
          const rec = perDateRecords[i]?.find((r) => r.studentId === s._id);
          statuses[d] = rec?.status;
        });
        return { studentId: s._id, fullName: s.fullName, admissionNumber: s.admissionNumber, statuses };
      });
      setRangeRegister({ cls, section, dates: rangeDates, rows });
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
          /* Range register is wide (one column per date) — landscape gives it
             room without shrinking student names down to nothing. */
          @page { size: A4 ${printingRange ? 'landscape' : 'portrait'}; margin: 14mm; }
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
              <div className="hidden print:grid print:grid-cols-2 print:gap-8">
                {printColumns.map((chunk, colIdx) => (
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
                          <td className="py-1 pr-2 text-gray-500">{(colIdx === 0 ? 0 : printHalf) + i + 1}</td>
                          <td className="py-1 pr-2 font-medium text-gray-900">{r.fullName}</td>
                          <td className="py-1 pr-2 text-gray-700">{r.status ? STATUS_LABEL[r.status] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
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
            const regHalf = Math.ceil(reg.rows.length / 2);
            const regColumns = regSplit
              ? [reg.rows.slice(0, regHalf), reg.rows.slice(regHalf)]
              : [reg.rows];
            return (
              <div key={`${reg.cls}-${reg.section}`} style={idx > 0 ? { pageBreakBefore: 'always' } : undefined}>
                <div className="mb-4">
                  <p className="text-base font-bold text-gray-900">{schoolSettings?.schoolName ?? 'School'}</p>
                  <p className="text-sm text-gray-700">Attendance — Class {reg.cls} / {reg.section} — {date}</p>
                </div>

                {regSplit ? (
                  <div className="grid grid-cols-2 gap-8">
                    {regColumns.map((chunk, colIdx) => (
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
                              <td className="py-1 pr-2 text-gray-500">{(colIdx === 0 ? 0 : regHalf) + i + 1}</td>
                              <td className="py-1 pr-2 font-medium text-gray-900">{r.fullName}</td>
                              <td className="py-1 pr-2 text-gray-700">{r.status ? STATUS_LABEL[r.status] : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ))}
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
      {printingRange && rangeRegister && (
        <div id={printRangeAreaId} className="hidden print:block">
          <div className="mb-4">
            <p className="text-base font-bold text-gray-900">{schoolSettings?.schoolName ?? 'School'}</p>
            <p className="text-sm text-gray-700">
              Attendance — Class {rangeRegister.cls} / {rangeRegister.section} — {shortDate(rangeRegister.dates[0])} to{' '}
              {shortDate(rangeRegister.dates[rangeRegister.dates.length - 1])}
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
              </tr>
            </thead>
            <tbody>
              {rangeRegister.rows.map((r, i) => (
                <tr key={r.studentId} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-gray-500">{i + 1}</td>
                  <td className="py-1 pr-2 font-medium text-gray-900 whitespace-nowrap">{r.fullName}</td>
                  {rangeRegister.dates.map((d) => (
                    <td key={d} className="py-1 px-1 text-center text-gray-700">
                      {r.statuses[d] ? STATUS_CODE[r.statuses[d]!] : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-300 text-[10px] font-semibold text-gray-900">
            <span>Total Students: {rangeRegister.rows.length}</span>
            <span>P = Present</span>
            <span>A = Absent</span>
            <span>L = Late</span>
            <span>H = Half Day</span>
            <span>O = On Leave</span>
            <span>— = Unmarked</span>
          </div>
        </div>
      )}
    </div>
  );
}
