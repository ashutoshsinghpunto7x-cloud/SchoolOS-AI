import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Trophy } from 'lucide-react';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMockTestForTaking, useSubmitMockTest } from '@/features/mock-tests/hooks/useMockTests';
import type { SubmitMockTestResult } from '@schoolos/types';

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TakeTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeChild, isLoading: workspaceLoading } = useParentWorkspace();

  const { data, isLoading, isError, error } = useMockTestForTaking(id, activeChild?._id);
  const submit = useSubmitMockTest();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<SubmitMockTestResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (data?.test) setSecondsLeft(data.test.durationMinutes * 60);
  }, [data?.test.durationMinutes]);

  const handleSubmit = useMemo(
    () => async (auto: boolean) => {
      if (!id || !activeChild || submittedRef.current) return;
      submittedRef.current = true;
      try {
        const payload = {
          childId: activeChild._id,
          answers: Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex })),
        };
        const res = await submit.mutateAsync({ id, payload });
        setResult(res);
        if (auto) toast.info('Time is up — your test was submitted automatically.');
      } catch (err) {
        submittedRef.current = false;
        toast.error('Could not submit', { description: err instanceof Error ? err.message : undefined });
      }
    },
    [id, activeChild, answers, submit],
  );

  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      void handleSubmit(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, result, handleSubmit]);

  if (workspaceLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="h-40 w-full max-w-md bg-gray-100 rounded-2xl animate-pulse mx-4" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <EmptyState icon={Clock} title="This test isn't available" description={error instanceof Error ? error.message : 'It may not be open right now.'} />
        <div className="text-center pb-8">
          <button type="button" onClick={() => navigate('/parent/tests')} className="text-sm font-semibold text-purple-700">Back to tests</button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Test submitted</h1>
          <p className="text-4xl font-bold text-purple-700 mt-4 tabular-nums">{result.score} / {result.totalMarks}</p>
          <p className="text-sm text-gray-500 mt-1">{result.correctCount} of {result.totalQuestions} correct · {result.scorePercent}%</p>
          {result.mode === 'ranked' && result.rank && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700">
              <Trophy className="w-4 h-4" /> Rank #{result.rank}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate('/parent/tests')}
            className="mt-6 w-full h-11 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition-colors"
          >
            Back to tests
          </button>
        </div>
      </div>
    );
  }

  const { test, questions } = data;
  const question = questions[current];
  const answeredCount = Object.keys(answers).length;
  const timeCritical = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-8">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{test.title}</p>
            <p className="text-xs text-gray-400">Question {current + 1} of {questions.length}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-bold tabular-nums shrink-0 ${timeCritical ? 'text-red-600' : 'text-gray-700'}`}>
            <Clock className="w-4 h-4" /> {secondsLeft !== null ? formatClock(secondsLeft) : '--:--'}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <p className="text-base font-semibold text-gray-900 mb-4">{question.questionText}</p>
          <div className="space-y-2.5">
            {question.options.map((opt, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [question._id]: oi }))}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  answers[question._id] === oi
                    ? 'border-purple-600 bg-purple-50 text-purple-800 font-semibold'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {String.fromCharCode(65 + oi)}. {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <p className="text-xs text-gray-400">{answeredCount} / {questions.length} answered</p>
          {current < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit(false)}
              disabled={submit.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold"
            >
              {submit.isPending ? 'Submitting…' : 'Submit Test'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default TakeTestPage;
