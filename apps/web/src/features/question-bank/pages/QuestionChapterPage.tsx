import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Sparkles } from 'lucide-react';
import { useQuestions, useDeleteQuestion } from '../hooks/useQuestionBank';
import type { QuestionDifficulty } from '@schoolos/types';

const DIFFICULTY_BADGE: Record<QuestionDifficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-red-50 text-red-600',
};

/** Drill-in screen for one class/subject/chapter row from the grouped Question Bank landing view. */
export function QuestionChapterPage() {
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const params = new URLSearchParams(window.location.search);
  const cls = params.get('class') ?? '';
  const subject = params.get('subject') ?? '';
  const chapterName = params.get('chapterName') ?? 'Chapter';

  const { data, isLoading } = useQuestions({ chapterId, class: cls || undefined, subject: subject || undefined, limit: 200 });
  const deleteQuestion = useDeleteQuestion();

  async function handleDelete(id: string) {
    try {
      await deleteQuestion.mutateAsync(id);
      toast.success('Question deleted');
    } catch (err) {
      toast.error('Could not delete', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/teacher/question-bank')} className="text-gray-500 dark:text-white/60 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">{chapterName}</h1>
          <p className="text-[11px] text-gray-400">Class {cls} · {subject}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-5 space-y-2.5">
        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

        {!isLoading && data && data.data.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No questions found in this chapter.</p>
          </div>
        )}

        {data?.data.map((q) => (
          <div key={q._id} className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 p-3.5 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-white/80">{q.questionText}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[q.difficulty]}`}>{q.difficulty}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.marks} mark(s)</span>
                {q.topic && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.topic}</span>
                )}
              </div>
            </div>
            <button type="button" onClick={() => handleDelete(q._id)} className="text-gray-300 hover:text-red-500 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
