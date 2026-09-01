import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useAcademicYear, useUpsertAcademicYear } from '../hooks/useAcademicYear';
import { cn } from '@/lib/utils';

const WEEKDAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
];

function toInputDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

interface TermDraft {
  termId: string;
  label: string;
  startDate: string;
  endDate: string;
}

export function CoordinatorCalendarPage() {
  const navigate = useNavigate();
  const { data: academicYear, isLoading } = useAcademicYear();
  const upsert = useUpsertAcademicYear();

  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0, 6]);
  const [terms, setTerms] = useState<TermDraft[]>([]);

  useEffect(() => {
    if (!academicYear) return;
    setLabel(academicYear.label);
    setStartDate(toInputDate(academicYear.startDate));
    setEndDate(toInputDate(academicYear.endDate));
    setWeeklyOffDays(academicYear.weeklyOffDays ?? [0, 6]);
    setTerms(academicYear.terms.map((t) => ({ termId: t.termId, label: t.label, startDate: toInputDate(t.startDate), endDate: toInputDate(t.endDate) })));
  }, [academicYear]);

  function toggleWeeklyOff(day: number) {
    setWeeklyOffDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function addTerm() {
    setTerms((prev) => [...prev, { termId: crypto.randomUUID(), label: `Term ${prev.length + 1}`, startDate: '', endDate: '' }]);
  }

  function updateTerm(termId: string, patch: Partial<TermDraft>) {
    setTerms((prev) => prev.map((t) => (t.termId === termId ? { ...t, ...patch } : t)));
  }

  function removeTerm(termId: string) {
    setTerms((prev) => prev.filter((t) => t.termId !== termId));
  }

  async function handleSave() {
    if (!label.trim() || !startDate || !endDate) {
      toast.error('Label, start date, and end date are required');
      return;
    }
    const incompleteTerm = terms.find((t) => !t.label.trim() || !t.startDate || !t.endDate);
    if (incompleteTerm) {
      toast.error('Every term needs a label, start date, and end date — or remove it');
      return;
    }
    try {
      await upsert.mutateAsync({
        label: label.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        weeklyOffDays,
        terms: terms.map((t) => ({
          termId: t.termId, label: t.label.trim(),
          startDate: new Date(t.startDate).toISOString(), endDate: new Date(t.endDate).toISOString(),
        })),
      });
      toast.success('Academic calendar saved');
    } catch (err) {
      toast.error('Could not save calendar', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="px-6 pt-6 pb-4 max-w-3xl mx-auto">
        <button onClick={() => navigate('/coordinator')} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[26px] sm:text-[32px] font-bold text-gray-900 tracking-tight leading-none">Academic Calendar</h1>
        <p className="text-base text-gray-500 mt-2">
          Every plan the engine generates is computed from this — session dates, weekly-offs, and terms.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" /></div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-900 mb-3">Session</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Label</label>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 2026-27"
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Session start</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Session end</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-900 mb-1">Weekly-off days</p>
              <p className="text-xs text-gray-400 mb-3">Days the engine never schedules teaching on, every week.</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => (
                  <button key={d.value} type="button" onClick={() => toggleWeeklyOff(d.value)}
                    className={cn(
                      'h-9 px-3.5 rounded-lg text-xs font-bold border transition-colors',
                      weeklyOffDays.includes(d.value) ? 'bg-[#1C2B4A] text-white border-[#1C2B4A]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                    )}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">Terms</p>
                <button type="button" onClick={addTerm} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200">
                  <Plus className="w-3.5 h-3.5" /> Add term
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Optional — leave empty to treat the whole session as one term.</p>
              {terms.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No terms defined yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {terms.map((t) => (
                    <div key={t.termId} className="flex items-end gap-3 border border-gray-100 rounded-xl p-3">
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-gray-500">Label</label>
                        <input value={t.label} onChange={(e) => updateTerm(t.termId, { label: e.target.value })}
                          className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-gray-500">Start</label>
                        <input type="date" value={t.startDate} onChange={(e) => updateTerm(t.termId, { startDate: e.target.value })}
                          className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-gray-500">End</label>
                        <input type="date" value={t.endDate} onChange={(e) => updateTerm(t.termId, { endDate: e.target.value })}
                          className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <button type="button" onClick={() => removeTerm(t.termId)} className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button" disabled={upsert.isPending} onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#1C2B4A] text-white text-sm font-bold disabled:opacity-60"
            >
              {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
