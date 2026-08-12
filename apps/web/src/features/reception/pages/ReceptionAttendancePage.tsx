import { useMemo, useState, useId, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { useClassAttendance } from '@/features/attendance/hooks/useAttendance';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import type { AttendanceStatus } from '@schoolos/types';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present:        'Present',
  absent:         'Absent',
  late:           'Late',
  half_day:       'Half Day',
  leave_approved: 'On Leave',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** Reception-facing, print/PDF-friendly view of a single class's attendance —
 *  built for the front desk to keep an offline paper record, not to mark
 *  attendance (that stays teacher/admin/principal-only, server-enforced). */
export function ReceptionAttendancePage() {
  const navigate = useNavigate();
  const printAreaId = `reception-attendance-print-${useId().replace(/[:]/g, '')}`;

  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState(todayStr());
  const [printing, setPrinting] = useState(false);

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

  const ready = !!cls && !!section;
  const loading = classesLoading || (ready && (studentsLoading || recordsLoading));

  useEffect(() => {
    if (!printing) return;
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('afterprint', reset); };
  }, [printing]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 sm:p-6">
      {printing && (
        <style>{`
          @page { size: A4 portrait; margin: 16mm; }
          @media print {
            body * { visibility: hidden; }
            #${printAreaId}, #${printAreaId} * { visibility: visible; }
            #${printAreaId} { position: absolute; top: 0; left: 0; width: 100%; }
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
          <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayStr()}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setPrinting(true)}
          disabled={!ready || loading || rows.length === 0}
          className="h-10 px-4 rounded-lg bg-[#1C2B4A] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
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

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 w-10">#</th>
                  <th className="py-2 pr-3">Admission No.</th>
                  <th className="py-2 pr-3">Student Name</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.studentId} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-3 text-gray-600">{r.admissionNumber}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{r.fullName}</td>
                    <td className="py-2 pr-3 text-gray-700">{r.status ? STATUS_LABEL[r.status] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {loading && ready && <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto mt-4 print:hidden" />}
      </div>
    </div>
  );
}
