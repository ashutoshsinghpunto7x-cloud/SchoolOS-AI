import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Minus, Calendar } from 'lucide-react';
import type { AttendanceStatus, Student } from '@schoolos/types';
import { useBulkMarkAttendance } from '../hooks/useAttendance';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';

interface StudentRow {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  status: AttendanceStatus;
  note: string;
}

interface Props {
  students: Student[];
  cls: string;
  section: string;
  date: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const STATUS_BUTTONS: { status: AttendanceStatus; icon: React.ReactNode; label: string; activeClass: string }[] = [
  { status: 'present',        icon: <CheckCircle2 className="w-4 h-4" />, label: 'P',  activeClass: 'bg-green-600 text-white border-green-600' },
  { status: 'absent',         icon: <XCircle      className="w-4 h-4" />, label: 'A',  activeClass: 'bg-red-600 text-white border-red-600' },
  { status: 'late',           icon: <Clock        className="w-4 h-4" />, label: 'L',  activeClass: 'bg-yellow-500 text-white border-yellow-500' },
  { status: 'half_day',       icon: <Minus        className="w-4 h-4" />, label: 'H',  activeClass: 'bg-orange-500 text-white border-orange-500' },
  { status: 'leave_approved', icon: <Calendar     className="w-4 h-4" />, label: 'LV', activeClass: 'bg-[#5B21B6] text-white border-blue-600' },
];

export function BulkAttendanceForm({ students, cls, section, date, onSuccess, onCancel }: Props) {
  const { mutateAsync: bulkMark, isPending } = useBulkMarkAttendance();

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [markAll, setMarkAll] = useState<AttendanceStatus>('present');

  useEffect(() => {
    setRows(
      students.map((s) => ({
        studentId:       s._id,
        fullName:        s.fullName,
        admissionNumber: s.admissionNumber,
        status:          'present',
        note:            '',
      }))
    );
  }, [students]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => r.studentId === studentId ? { ...r, status } : r));
  }

  function setNote(studentId: string, note: string) {
    setRows((prev) => prev.map((r) => r.studentId === studentId ? { ...r, note } : r));
  }

  function applyAll(status: AttendanceStatus) {
    setMarkAll(status);
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  async function handleSubmit() {
    await bulkMark({
      class:   cls,
      section,
      date,
      records: rows.map((r) => ({
        studentId: r.studentId,
        status:    r.status,
        note:      r.note || undefined,
      })),
    });
    onSuccess?.();
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        No students found for {cls} – {section}.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">
              Class {cls} – {section} &nbsp;·&nbsp; {date}
            </span>
            <span className="ml-3 text-sm text-gray-500">{rows.length} students</span>
          </div>
          <div className="flex gap-2 text-sm">
            {Object.entries(counts).map(([s, c]) => (
              <span key={s} className="flex items-center gap-1">
                <AttendanceStatusBadge status={s as AttendanceStatus} size="sm" />
                <span className="font-semibold">{c}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Mark-all row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">Mark all:</span>
          {STATUS_BUTTONS.map((btn) => (
            <button
              key={btn.status}
              type="button"
              onClick={() => applyAll(btn.status)}
              className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors
                ${markAll === btn.status
                  ? btn.activeClass
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {rows.map((row, idx) => (
          <div key={row.studentId} className="flex items-center gap-3 px-4 py-3">
            {/* Index + name */}
            <span className="w-6 text-xs text-gray-400 shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{row.fullName}</p>
              <p className="text-xs text-gray-400">{row.admissionNumber}</p>
            </div>

            {/* Status buttons */}
            <div className="flex gap-1 shrink-0">
              {STATUS_BUTTONS.map((btn) => (
                <button
                  key={btn.status}
                  type="button"
                  title={btn.status.replace(/_/g, ' ')}
                  onClick={() => setStatus(row.studentId, btn.status)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-colors
                    ${row.status === btn.status
                      ? btn.activeClass
                      : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Optional note */}
            <input
              type="text"
              placeholder="Note (optional)"
              value={row.note}
              onChange={(e) => setNote(row.studentId, e.target.value)}
              className="w-36 shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#A855F7]"
            />
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="px-6 py-2 text-sm font-semibold bg-[#5B21B6] text-white rounded-lg hover:bg-[#4C1D95] disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : `Submit Attendance (${rows.length})`}
        </button>
      </div>
    </div>
  );
}
