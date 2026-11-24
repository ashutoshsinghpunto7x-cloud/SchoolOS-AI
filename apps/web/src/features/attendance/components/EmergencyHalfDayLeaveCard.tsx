import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2, Search, ShieldAlert, UserCheck } from 'lucide-react';
import { studentsApi } from '@/features/students/api/students.api';
import { attendanceApi } from '@/features/attendance/api/attendance.api';
import type { Student } from '@schoolos/types';

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const QUICK_REASONS = ['Medical / Unwell', 'Family Emergency', 'Parent Early Pickup'];

export function EmergencyHalfDayLeaveCard({
  scopedClasses,
}: {
  /** Optional class-section filter (e.g. a teacher's assigned classes). */
  scopedClasses?: { class: string; section: string }[];
}) {
  const queryClient = useQueryClient();
  const today = todayLocalISO();

  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reason, setReason] = useState('');
  const [timeOut, setTimeOut] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { data: studentsPage, isFetching: searching } = useQuery({
    queryKey: ['half-day-student-search', search],
    queryFn: () => studentsApi.listPaginated({ search: search.trim() || undefined, limit: 8, status: 'active' }),
    staleTime: 30_000,
  });

  const { data: halfDayToday, isLoading: loadingList } = useQuery({
    queryKey: ['attendance-half-day-today', today],
    queryFn: () => attendanceApi.list({ date: today, status: 'half_day', limit: 20 }),
    staleTime: 15_000,
  });

  const candidateStudents = useMemo(() => {
    const rows = studentsPage?.data ?? [];
    if (!scopedClasses || scopedClasses.length === 0) return rows;
    const allowed = new Set(scopedClasses.map((c) => `${c.class}::${c.section}`));
    const filtered = rows.filter((s) => allowed.has(`${s.class}::${s.section}`));
    return filtered.length > 0 ? filtered : rows;
  }, [studentsPage, scopedClasses]);

  const studentNameMap = useMemo(() => {
    const map = new Map<string, Student>();
    for (const s of studentsPage?.data ?? []) {
      map.set(s._id, s);
    }
    return map;
  }, [studentsPage]);

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error('Select a student first.');
      const trimmedReason = reason.trim();
      if (!trimmedReason) throw new Error('Enter the emergency reason.');
      return attendanceApi.markSingle({
        studentId: selectedStudent._id,
        class: selectedStudent.class,
        section: selectedStudent.section,
        date: today,
        status: 'half_day',
        note: `Emergency half-day (${timeOut}): ${trimmedReason}`,
      });
    },
    onSuccess: () => {
      setFeedback({
        type: 'ok',
        text: `Half-day leave approved for ${selectedStudent?.fullName ?? 'student'}.`,
      });
      setSelectedStudent(null);
      setReason('');
      setSearch('');
      void queryClient.invalidateQueries({ queryKey: ['attendance-half-day-today', today] });
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: Error) => {
      setFeedback({ type: 'err', text: err.message || 'Could not approve half-day leave.' });
    },
  });

  const todayLeaves = halfDayToday?.data ?? [];

  return (
    <section
      aria-labelledby="emergency-half-day-heading"
      className="bg-white border border-[#E8E2D6] rounded-[18px] shadow-xs p-5 font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFEAE0]">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-[#D9822B] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <div>
            <h2 id="emergency-half-day-heading" className="text-[16px] font-bold text-[#1B2A4E] m-0">
              Emergency Half-Day Student Leave
            </h2>
            <p className="text-[12px] text-[#55607A] m-0">
              Approve early departure for a student leaving due to an emergency today
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FBF8F3] border border-[#E8E2D6] text-[#1B2A4E]">
          {todayLeaves.length} today
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
        {/* Left: Quick Approval Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFeedback(null);
            grantMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label htmlFor="half-day-student-search" className="block text-[12px] font-semibold text-[#1B2A4E] mb-1">
              Student
            </label>
            {selectedStudent ? (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#EEF1F8] border border-[#254A9A]/20">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#1B2A4E] truncate m-0">{selectedStudent.fullName}</p>
                  <p className="text-[11.5px] text-[#55607A] m-0">
                    Class {selectedStudent.class}–{selectedStudent.section}
                    {selectedStudent.admissionNumber ? ` · #${selectedStudent.admissionNumber}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="text-[11.5px] font-semibold text-[#254A9A] hover:underline shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 bg-[#FBF8F3] border border-[#E8E2D6] focus-within:border-[#254A9A] rounded-xl px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-[#7B859D] shrink-0" />
                  <input
                    id="half-day-student-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student name or admission no…"
                    className="flex-1 min-w-0 bg-transparent text-[13px] text-[#1B2A4E] placeholder:text-[#8A93A8] outline-none"
                  />
                  {searching && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#55607A]" />}
                </div>
                {candidateStudents.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-[#E8E2D6] bg-white divide-y divide-[#F5F1E8]">
                    {candidateStudents.slice(0, 5).map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setFeedback(null);
                        }}
                        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#FBF8F3] transition-colors cursor-pointer"
                      >
                        <span className="text-[12.5px] font-semibold text-[#1B2A4E] truncate">{s.fullName}</span>
                        <span className="text-[11px] text-[#55607A] shrink-0 ml-2">
                          {s.class}–{s.section}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label htmlFor="half-day-reason" className="block text-[12px] font-semibold text-[#1B2A4E] mb-1">
                Emergency Reason
              </label>
              <input
                id="half-day-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Sudden fever, parent pickup"
                className="w-full bg-[#FBF8F3] border border-[#E8E2D6] focus:border-[#254A9A] rounded-xl px-3 py-2 text-[13px] text-[#1B2A4E] placeholder:text-[#8A93A8] outline-none"
              />
            </div>
            <div>
              <label htmlFor="half-day-time" className="block text-[12px] font-semibold text-[#1B2A4E] mb-1">
                Departure Time
              </label>
              <input
                id="half-day-time"
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className="w-full bg-[#FBF8F3] border border-[#E8E2D6] focus:border-[#254A9A] rounded-xl px-3 py-2 text-[13px] text-[#1B2A4E] outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FBF8F3] hover:bg-[#EFEAE0] border border-[#E8E2D6] text-[#55607A] hover:text-[#1B2A4E] cursor-pointer"
              >
                {r}
              </button>
            ))}
          </div>

          {feedback && (
            <div
              className={`px-3 py-2 rounded-xl text-[12px] font-medium flex items-center gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedStudent || !reason.trim() || grantMutation.isPending}
            className="w-full h-10 rounded-xl bg-[#1B2A4E] hover:bg-[#15223E] text-white text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-45 cursor-pointer transition-colors"
          >
            {grantMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            <span>Allow Half-Day Leave</span>
          </button>
        </form>

        {/* Right: Today's Approved Half-Day Leaves */}
        <div className="rounded-2xl bg-[#FBF8F3]/75 border border-[#EFEAE0] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[12.5px] font-bold text-[#1B2A4E] m-0">Approved Today</p>
            <span className="text-[11px] text-[#7B859D]">{today}</span>
          </div>
          {loadingList ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#55607A]" />
            </div>
          ) : todayLeaves.length === 0 ? (
            <p className="text-[12.5px] text-[#7B859D] py-6 text-center m-0">
              No emergency half-day student leaves recorded today.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {todayLeaves.map((rec) => {
                const matched = studentNameMap.get(rec.studentId);
                return (
                  <div
                    key={rec._id}
                    className="rounded-xl bg-white border border-[#E8E2D6] px-3 py-2.5 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#1B2A4E] truncate m-0">
                        {matched?.fullName ?? `Student #${rec.studentId.slice(-5)}`} · {rec.class}–{rec.section}
                      </p>
                      <p className="text-[11.5px] text-[#55607A] m-0 mt-0.5 line-clamp-2">
                        {rec.note || 'Half-day emergency leave'}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      <Clock className="w-3 h-3" />
                      Half-day
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
