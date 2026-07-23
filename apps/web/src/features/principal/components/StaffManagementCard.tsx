import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useSubstitutes,
  useNeedsSubstitute,
  useSuggestSubstituteTeachers,
  useCreateSubstitute,
} from '@/features/timetable/hooks/useTimetable';
import {
  usePendingLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '@/features/leave-requests/hooks/useLeaveRequests';
import type { NeedsSubstituteEntry, LeaveRequest } from '@schoolos/types';

const todayStr = () => new Date().toISOString().split('T')[0];

function AssignPicker({ entry, onDone }: { entry: NeedsSubstituteEntry; onDone: () => void }) {
  const { data: suggestions, isLoading } = useSuggestSubstituteTeachers(entry.class, entry.section, entry.originalTeacherId, entry.dayOfWeek);
  const { mutateAsync: createSubstitute, isPending } = useCreateSubstitute();
  const [error, setError] = useState('');

  async function assign(teacherId: string, teacherName: string) {
    setError('');
    try {
      await createSubstitute({
        timetableId: entry.timetableId,
        class: entry.class,
        section: entry.section,
        date: entry.date,
        dayOfWeek: entry.dayOfWeek,
        slotId: entry.slotId,
        subjectName: entry.subjectName,
        originalTeacherId: entry.originalTeacherId,
        originalTeacherName: entry.originalTeacherName,
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
        <p className="text-xs text-gray-400 py-2">Finding teachers…</p>
      ) : !suggestions?.length ? (
        <p className="text-xs text-gray-400 py-1">No active teachers available.</p>
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
                {s.teachesThisClass && <span className="text-[#F59E0B]">Teaches this class</span>}
                <span className={s.freePeriodsToday > 0 ? 'text-[#22C55E]' : 'text-gray-400'}>
                  {s.freePeriodsToday} free
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

function LeaveRow({ request }: { request: LeaveRequest }) {
  const { mutateAsync: approve, isPending: approving } = useApproveLeaveRequest();
  const { mutateAsync: reject, isPending: rejecting } = useRejectLeaveRequest();
  const [rejectingLocal, setRejectingLocal] = useState(false);
  const busy = approving || rejecting;

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#111827] truncate">{request.teacherName}</p>
        <p className="text-[11px] text-[#6B7280] truncate">
          {request.leaveType === 'full_day' ? 'Full day' : 'Half day'}
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
          {approving ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setRejectingLocal(true); void reject({ id: request._id, payload: {} }).finally(() => setRejectingLocal(false)); }}
          className="h-7 px-2.5 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-[11px] font-semibold disabled:opacity-50"
        >
          {rejectingLocal ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

// Merges the old Daily Substitutions and Leave Approvals cards — both are
// staff-facing decisions a Principal makes at the same point in the day, so
// they now share one card with a single clean empty state when there's
// nothing pending in either, instead of two separately-blank boxes.
export function StaffManagementCard() {
  const navigate = useNavigate();
  const today = todayStr();
  const { data: subsData, isLoading: subsLoading } = useSubstitutes({ dateFrom: today, dateTo: today, limit: 50 });
  const { data: needed, isLoading: neededLoading } = useNeedsSubstitute(today);
  const { data: leaveRequests, isLoading: leaveLoading } = usePendingLeaveRequests();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const substitutes = subsData?.data ?? [];
  const pendingLeave = leaveRequests ?? [];
  const isLoading = subsLoading || neededLoading || leaveLoading;
  const isEmpty = !isLoading && substitutes.length === 0 && (needed?.length ?? 0) === 0 && pendingLeave.length === 0;

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight">Staff Management</h3>
          <p className="text-[12px] text-[#6B7280] font-medium">Substitutions and leave, today</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/timetable/substitutes')}
          className="h-7 px-2.5 rounded-lg bg-white border border-black/[0.08] text-[11px] font-semibold text-[#6B7280] hover:border-[#6D4AFF]/25 hover:text-[#6D4AFF] transition-colors shrink-0"
        >
          Manage
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
      ) : isEmpty ? (
        <div className="py-10 text-center text-sm text-gray-400">No substitutions or leave requests pending today.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Substitutions</p>
            {substitutes.length === 0 && (needed?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 py-3">No substitutions needed today.</p>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {(needed ?? []).map((n) => {
                  const key = `${n.class}||${n.section}||${n.slotId}`;
                  return (
                    <div key={key} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#111827] truncate">
                            Class {n.class}{n.section ? ` – ${n.section}` : ''} · {n.subjectName}
                          </p>
                          <p className="text-[11px] text-[#F59E0B] truncate">{n.originalTeacherName} is on leave — needs cover</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenKey(openKey === key ? null : key)}
                          className="h-7 px-2.5 rounded-lg bg-[#F59E0B]/10 text-[#B45309] text-[11px] font-semibold shrink-0 hover:bg-[#F59E0B]/20 transition-colors"
                        >
                          {openKey === key ? 'Close' : 'Assign'}
                        </button>
                      </div>
                      {openKey === key && <AssignPicker entry={n} onDone={() => setOpenKey(null)} />}
                    </div>
                  );
                })}
                {substitutes.map((sub) => (
                  <div key={sub._id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] truncate">
                        Class {sub.class}{sub.section ? ` – ${sub.section}` : ''} · {sub.subjectName}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate">
                        {sub.originalTeacherName ?? 'Unassigned'} → {sub.substituteTeacherName}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#6B7280] shrink-0 capitalize">{sub.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 md:border-l md:border-black/[0.06] md:pl-6">
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Leave Approvals</p>
            {pendingLeave.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">No pending leave requests.</p>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {pendingLeave.map((request) => <LeaveRow key={request._id} request={request} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
