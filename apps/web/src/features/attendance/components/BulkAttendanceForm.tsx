import { useState, useEffect } from 'react';
import { Check, ArrowRight, Loader2, MessageSquare } from 'lucide-react';
import type { AttendanceStatus, Student } from '@schoolos/types';
import { useBulkMarkAttendance } from '../hooks/useAttendance';

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

export function BulkAttendanceForm({ students, cls, section, date, onSuccess, onCancel }: Props) {
  const { mutateAsync: bulkMark, isPending } = useBulkMarkAttendance();

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

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
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  function setNote(studentId: string, note: string) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, note } : r)));
  }

  function handleMarkAllPresent() {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'present' })));
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const presentCount = counts['present'] ?? 0;
  const absentCount = counts['absent'] ?? 0;
  const lateCount = counts['late'] ?? 0;

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
      <div className="text-center py-12 text-[#55607A]">
        No active students found for Class {cls} – {section}.
      </div>
    );
  }

  return (
    <div className="space-y-5" id="attendance-register-root">
      {/* Top Control Header: Action buttons properly styled, visible, and high-contrast */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_4px_rgba(27,42,78,0.04)] border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Roll Call · Class {cls} Section {section}</span>
            </span>
            <span className="text-[12px] font-bold text-[#1B2A4E]">{rows.length} Students</span>
            <span className="text-[12px] text-[#55607A]">· {date}</span>
          </div>
          <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E] mt-1">
            Classroom Student Attendance Register
          </h1>
        </div>

        {/* Action Buttons: High contrast, styled per finalized demo */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="h-10 px-4 rounded-full bg-[#F3EEE3] hover:bg-[#E8E2D6] active:scale-95 text-[#1B2A4E] text-[13px] font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-[#D9822B]" />
            <span>Mark All Present</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-10 px-5 rounded-full bg-[#1B2A4E] hover:bg-[#263B6E] active:scale-95 text-white text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#F5B332]" />
                <span>Saving Register…</span>
              </>
            ) : (
              <>
                <span>Save Attendance</span>
                <ArrowRight className="w-4 h-4 text-[#F5B332]" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Student Roster Card */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_4px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-4">
        {/* Roster Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[14px] font-bold text-[#1B2A4E]">
              Student Roster (Class {cls}-{section})
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {presentCount} Present
            </span>
            <span className="text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
              {absentCount} Absent
            </span>
            <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
              {lateCount} Late
            </span>
          </div>
        </div>

        {/* Roster Rows: Present/Absent/Late directly BESIDE the name */}
        <div className="divide-y divide-black/5">
          {rows.map((row, idx) => {
            const isPresent = row.status === 'present';
            const isAbsent = row.status === 'absent';
            const isLate = row.status === 'late';
            const rollNumber = String(idx + 1).padStart(2, '0');

            return (
              <div key={row.studentId} className="py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">
                  {/* Left: Roll badge + Student name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">
                      {rollNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">
                        {row.fullName}
                      </p>
                      {row.note && (
                        <p className="text-[11px] text-red-600 font-semibold truncate leading-tight">
                          {row.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: 3-way toggle directly BESIDE the name on the exact same row */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <div className="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setStatus(row.studentId, 'present')}
                        title="Present (P)"
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all ${
                          isPresent
                            ? 'bg-emerald-600 text-white shadow-xs scale-105'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(row.studentId, 'absent')}
                        title="Absent (A)"
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all ${
                          isAbsent
                            ? 'bg-red-600 text-white shadow-xs scale-105'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(row.studentId, 'late')}
                        title="Late (L)"
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all ${
                          isLate
                            ? 'bg-amber-500 text-white shadow-xs scale-105'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                      >
                        L
                      </button>
                    </div>

                    <button
                      type="button"
                      title="Add note"
                      onClick={() =>
                        setActiveNoteId((prev) => (prev === row.studentId ? null : row.studentId))
                      }
                      className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${
                        row.note ? 'text-[#D9822B]' : 'text-gray-400'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Collapsible note input if active */}
                {activeNoteId === row.studentId && (
                  <div className="pl-9 pr-2 pt-1 pb-1">
                    <input
                      type="text"
                      placeholder="Add reason or note (e.g. Fever, bus delayed, doctor appointment)…"
                      value={row.note}
                      onChange={(e) => setNote(row.studentId, e.target.value)}
                      className="w-full text-xs border border-[#E8E2D6] rounded-lg px-3 py-1.5 text-[#1B2A4E] placeholder-[#55607A]/60 bg-[#FBF8F3] focus:outline-none focus:border-[#1B2A4E]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom controls */}
        {onCancel && (
          <div className="pt-3 border-t border-[#E8E2D6] flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-[#55607A] hover:text-[#1B2A4E] px-4 py-2"
            >
              Cancel &amp; Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
