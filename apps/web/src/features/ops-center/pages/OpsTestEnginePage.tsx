import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useOpsSchools } from '../hooks/useOpsData';
import {
  useMockTestChapters, useGenerateMockTest, useCreateMockTest, useSubmitMockTestForApproval, useOpsMockTests,
} from '@/features/mock-tests/hooks/useMockTests';
import type { GeneratedMockTestQuestion, MockTestMode, MockTestStatus } from '@schoolos/types';

const STATUS_COLORS: Record<MockTestStatus, string> = {
  draft: '#98A2B3',
  pending_approval: '#F59E0B',
  approved: '#3B82F6',
  rejected: '#EF4444',
  live: '#22C55E',
  closed: '#64748B',
};

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function OpsTestEnginePage() {
  const { data: schools } = useOpsSchools();
  const [schoolId, setSchoolId] = useState('');
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');

  const [questions, setQuestions] = useState<GeneratedMockTestQuestion[] | null>(null);
  const [chapterNames, setChapterNames] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [mode, setMode] = useState<MockTestMode>('anonymous');
  const in1Hour = useMemo(() => new Date(Date.now() + 60 * 60_000), []);
  const in2Hours = useMemo(() => new Date(Date.now() + 2 * 60 * 60_000), []);
  const [scheduledStart, setScheduledStart] = useState(() => toLocalDateTimeInputValue(in1Hour));
  const [scheduledEnd, setScheduledEnd] = useState(() => toLocalDateTimeInputValue(in2Hours));

  const { data: chapters, isLoading: chaptersLoading } = useMockTestChapters(schoolId, cls, subject);
  const generate = useGenerateMockTest();
  const create = useCreateMockTest();
  const submitForApproval = useSubmitMockTestForApproval();
  const { data: tests, isLoading: testsLoading } = useOpsMockTests({ schoolId });

  const [savedTestId, setSavedTestId] = useState<string | null>(null);

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleGenerate() {
    if (!schoolId || !cls || !subject || selectedChapterIds.length === 0) {
      toast.error('Pick a school, class, subject and at least one chapter first');
      return;
    }
    try {
      const result = await generate.mutateAsync({ schoolId, class: cls, subject, chapterIds: selectedChapterIds, questionCount, difficulty });
      setQuestions(result.questions);
      setChapterNames(result.chapterNames);
      setTitle(`${subject} Mock Test — ${result.chapterNames.join(', ')}`);
      setSavedTestId(null);
      if (result.warnings.length) toast.warning(result.warnings.join(' '));
      else toast.success(`${result.questions.length} question(s) generated — review before saving`);
    } catch (err) {
      toast.error('Generation failed', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function updateQuestion(index: number, patch: Partial<GeneratedMockTestQuestion>) {
    setQuestions((prev) => prev?.map((q, i) => (i === index ? { ...q, ...patch } : q)) ?? prev);
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev?.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q)) ?? prev,
    );
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev?.filter((_, i) => i !== index) ?? prev);
  }

  async function handleSaveDraft() {
    if (!questions || questions.length === 0 || !title.trim()) {
      toast.error('Generate questions and give the test a title first');
      return;
    }
    try {
      const test = await create.mutateAsync({
        schoolId, class: cls, subject, chapterIds: selectedChapterIds, chapterNames, title: title.trim(),
        questions, durationMinutes,
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduledEnd).toISOString(),
        mode,
      });
      setSavedTestId(test._id);
      toast.success('Saved as draft');
    } catch (err) {
      toast.error('Could not save draft', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleSubmitForApproval() {
    if (!savedTestId) return;
    try {
      await submitForApproval.mutateAsync(savedTestId);
      toast.success('Submitted for principal approval');
      setQuestions(null);
      setSavedTestId(null);
    } catch (err) {
      toast.error('Could not submit for approval', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F4F6F8]">Test Engine</h1>
        <p className="mt-1 text-sm text-[#98A2B3]">
          Author MCQ mock tests from already-captured Question Bank chapters, then send for principal approval.
          WhatsApp delivery to parents is a logging-only stub for now (Meta template pending approval).
        </p>
      </div>

      {/* ── Step 1: target + chapters ── */}
      <section className="rounded-2xl border border-[#232D38] bg-[#121922] p-5 space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[#98A2B3]">1. Pick school, class, subject and chapter(s)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={schoolId}
            onChange={(e) => { setSchoolId(e.target.value); setSelectedChapterIds([]); }}
            className="rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]"
          >
            <option value="">Select school…</option>
            {schools?.map((s) => (
              <option key={s.schoolId} value={s.schoolId}>{s.schoolName}</option>
            ))}
          </select>
          <input
            value={cls}
            onChange={(e) => { setCls(e.target.value); setSelectedChapterIds([]); }}
            placeholder="Class (e.g. 8)"
            className="rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B]"
          />
          <input
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setSelectedChapterIds([]); }}
            placeholder="Subject (e.g. Science)"
            className="rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B]"
          />
        </div>

        {schoolId && cls && subject && (
          <div>
            {chaptersLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#98A2B3]"><Loader2 className="h-4 w-4 animate-spin" /> Loading chapters…</div>
            ) : !chapters?.length ? (
              <p className="text-sm text-[#64748B]">No captured chapters found for this class/subject yet — capture one in Question Bank first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {chapters.map((c) => (
                  <label
                    key={c._id}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedChapterIds.includes(c._id)
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#F4F6F8]'
                        : 'border-[#232D38] text-[#98A2B3] hover:text-[#F4F6F8]'
                    }`}
                  >
                    <input type="checkbox" className="hidden" checked={selectedChapterIds.includes(c._id)} onChange={() => toggleChapter(c._id)} />
                    {c.chapterName}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[#98A2B3]">Question count</label>
            <input
              type="number" min={1} max={30} value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-24 rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#98A2B3]">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]"
            >
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6]/90 disabled:opacity-50"
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate MCQs
          </button>
        </div>
      </section>

      {/* ── Step 2: review/edit generated questions ── */}
      {questions && (
        <section className="rounded-2xl border border-[#232D38] bg-[#121922] p-5 space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[#98A2B3]">2. Review &amp; edit MCQs ({questions.length})</h2>
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-lg border border-[#232D38] bg-[#0F141B] p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <textarea
                    value={q.questionText}
                    onChange={(e) => updateQuestion(qi, { questionText: e.target.value })}
                    rows={2}
                    className="flex-1 rounded-md border border-[#232D38] bg-[#121922] px-2 py-1.5 text-sm text-[#F4F6F8]"
                  />
                  <button type="button" onClick={() => removeQuestion(qi)} className="shrink-0 rounded-md p-1.5 text-[#98A2B3] hover:text-[#EF4444]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm text-[#98A2B3]">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correctOptionIndex === oi}
                        onChange={() => updateQuestion(qi, { correctOptionIndex: oi })}
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        className="flex-1 rounded-md border border-[#232D38] bg-[#121922] px-2 py-1 text-sm text-[#F4F6F8]"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#98A2B3]">
                  Marks:
                  <input
                    type="number" min={0} value={q.marks}
                    onChange={(e) => updateQuestion(qi, { marks: Number(e.target.value) })}
                    className="w-16 rounded-md border border-[#232D38] bg-[#121922] px-2 py-1 text-[#F4F6F8]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs text-[#98A2B3]">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#98A2B3]">Duration (minutes)</label>
              <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="w-full rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#98A2B3]">Scheduled start</label>
              <input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} className="w-full rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#98A2B3]">Scheduled close</label>
              <input type="datetime-local" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} className="w-full rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#98A2B3]">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as MockTestMode)} className="w-full rounded-lg border border-[#232D38] bg-[#0F141B] px-3 py-2 text-sm text-[#F4F6F8]">
                <option value="anonymous">Anonymous (no per-student record)</option>
                <option value="ranked">Ranked (persisted, leaderboard)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={create.isPending || !!savedTestId}
              className="rounded-lg border border-[#232D38] px-4 py-2 text-sm font-medium text-[#F4F6F8] hover:bg-white/[0.04] disabled:opacity-50"
            >
              {create.isPending ? 'Saving…' : savedTestId ? 'Saved as draft' : 'Save as draft'}
            </button>
            {savedTestId && (
              <button
                type="button"
                onClick={handleSubmitForApproval}
                disabled={submitForApproval.isPending}
                className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-medium text-black hover:bg-[#22C55E]/90 disabled:opacity-50"
              >
                {submitForApproval.isPending ? 'Submitting…' : 'Submit for principal approval'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Existing tests for this school ── */}
      {schoolId && (
        <section className="rounded-2xl border border-[#232D38] bg-[#121922] p-5">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Tests for this school</h2>
          {testsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#98A2B3]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : !tests?.length ? (
            <p className="text-sm text-[#64748B]">No mock tests authored for this school yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#232D38] text-xs uppercase tracking-wide text-[#98A2B3]">
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Class / Subject</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Scheduled start</th>
                    <th className="px-3 py-2 text-right">Anonymous submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t._id} className="border-b border-[#232D38] last:border-0">
                      <td className="px-3 py-2 text-[#F4F6F8]">{t.title}</td>
                      <td className="px-3 py-2 text-[#98A2B3]">{t.class} · {t.subject}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs" style={{ color: STATUS_COLORS[t.status], borderColor: `${STATUS_COLORS[t.status]}40`, backgroundColor: `${STATUS_COLORS[t.status]}1A` }}>
                          {t.status.replace('_', ' ')}
                        </span>
                        {t.status === 'rejected' && t.rejectionReason && (
                          <div className="mt-1 text-xs text-[#EF4444]">{t.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[#98A2B3]">{new Date(t.scheduledStart).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-[#98A2B3]">
                        {t.mode === 'anonymous' ? t.anonymousSubmissionCount : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default OpsTestEnginePage;
