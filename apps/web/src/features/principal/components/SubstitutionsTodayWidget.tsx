import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, AlertTriangle, Loader2, ChevronDown, Star } from 'lucide-react';
import { useSubstitutes, useNeedsSubstitute, useSuggestSubstituteTeachers, useCreateSubstitute } from '@/features/timetable/hooks/useTimetable';
import type { NeedsSubstituteEntry } from '@schoolos/types';

const todayStr = () => new Date().toISOString().split('T')[0];

// ── Inline assign picker for one "needs substitute" period ─────────────────────

function AssignPicker({ entry, onDone }: { entry: NeedsSubstituteEntry; onDone: () => void }) {
  const { data: suggestions, isLoading } = useSuggestSubstituteTeachers(entry.class, entry.section, entry.originalTeacherId);
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
    <div className="mt-2 bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 max-h-40 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding teachers…
        </div>
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
              {s.teachesThisClass && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 shrink-0">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Teaches this class
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-[11px] text-red-500 mt-1 px-1">{error}</p>}
    </div>
  );
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function SubstitutionsTodayWidget() {
  const today = todayStr();
  const { data, isLoading } = useSubstitutes({ dateFrom: today, dateTo: today, limit: 50 });
  const { data: needed, isLoading: neededLoading } = useNeedsSubstitute(today);
  const navigate = useNavigate();
  const substitutes = data?.data ?? [];
  const [openKey, setOpenKey] = useState<string | null>(null);

  const isEmpty = !isLoading && !neededLoading && substitutes.length === 0 && (needed?.length ?? 0) === 0;

  return (
    <div className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[288px] flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Daily Substitutions</h3>
          <p className="text-[12px] text-gray-400 font-medium">Today's teacher cover</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/timetable/substitutes')}
          className="h-7 px-2.5 rounded-lg bg-white border border-[#E8E8E8] text-[11px] font-semibold text-gray-500 hover:bg-[#A855F7]/5 hover:border-[#A855F7]/25 hover:text-[#5B21B6] shrink-0"
        >
          Manage
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E8]/60">
        {isLoading || neededLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-gray-400">
            <Repeat className="w-6 h-6" />
            <p className="text-sm">No substitutions assigned today</p>
          </div>
        ) : (
          <>
            {/* Needs a substitute — auto-derived from approved leave, not yet assigned */}
            {(needed ?? []).map((n) => {
              const key = `${n.class}||${n.section}||${n.slotId}`;
              return (
                <div key={key} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        Class {n.class}{n.section ? ` – ${n.section}` : ''} · {n.subjectName}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {n.originalTeacherName} is on leave — needs cover
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenKey(openKey === key ? null : key)}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-amber-100 text-amber-700 text-[11px] font-bold shrink-0 hover:bg-amber-200 transition-colors"
                    >
                      Assign <ChevronDown className={`w-3 h-3 transition-transform ${openKey === key ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {openKey === key && <AssignPicker entry={n} onDone={() => setOpenKey(null)} />}
                </div>
              );
            })}

            {/* Already assigned */}
            {substitutes.map((sub) => (
              <div key={sub._id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">
                    Class {sub.class}{sub.section ? ` – ${sub.section}` : ''} · {sub.subjectName}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {sub.originalTeacherName ?? 'Unassigned'} → {sub.substituteTeacherName}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 capitalize">{sub.status}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
