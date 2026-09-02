import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Sparkles, Pencil, Check, X, Loader2 } from 'lucide-react';
import { useQuestions, useDeleteQuestion, useUpdateQuestion } from '../hooks/useQuestionBank';
import { stripOptionLabel } from '../lib/optionText';
import { OptionsEditor } from '../components/OptionsEditor';
import { QUESTION_TYPES, DIFFICULTIES, BLOOMS_LEVELS, labelize, needsCorrectAnswerField } from '../lib/questionTypeMeta';
import type { Question, QuestionDifficulty, QuestionType, BloomsLevel, UpdateQuestionPayload } from '@schoolos/types';

const DIFFICULTY_BADGE: Record<QuestionDifficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-red-50 text-red-600',
};

type EditState = {
  questionText: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  bloomsLevel: BloomsLevel;
  marks: number | '';
  estimatedTimeMinutes: number | '';
  topic: string;
  options: string[];
  correctAnswer: string;
};

function toEditState(q: Question): EditState {
  // Options load pre-stripped of any AI-baked letter label ("a. hut" -> "hut") so the editor
  // starts clean, and saving (even untouched) self-heals a legacy double-lettered question.
  const options = (q.options ?? []).map(stripOptionLabel);
  const correctAnswer = q.correctAnswer ? stripOptionLabel(q.correctAnswer) : '';
  return {
    questionText: q.questionText,
    questionType: q.questionType,
    difficulty: q.difficulty,
    bloomsLevel: q.bloomsLevel,
    marks: q.marks,
    estimatedTimeMinutes: q.estimatedTimeMinutes,
    topic: q.topic ?? '',
    options,
    correctAnswer,
  };
}

/** Drill-in screen for one class/subject/chapter row from the grouped Question Bank landing view. */
export function QuestionChapterPage() {
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const params = new URLSearchParams(window.location.search);
  const cls = params.get('class') ?? '';
  const subject = params.get('subject') ?? '';
  const chapterName = params.get('chapterName') ?? 'Chapter';

  const [filterDifficulty, setFilterDifficulty] = useState<QuestionDifficulty | ''>('');
  const [filterType, setFilterType] = useState<QuestionType | ''>('');

  const { data, isLoading } = useQuestions({
    chapterId, class: cls || undefined, subject: subject || undefined, limit: 200,
    difficulty: filterDifficulty || undefined, questionType: filterType || undefined,
  });
  const deleteQuestion = useDeleteQuestion();
  const [editingId, setEditingId] = useState<string | null>(null);

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
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value as QuestionDifficulty | '')}
            className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs bg-white"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{labelize(d)}</option>)}
          </select>
          <select
            value={filterType} onChange={(e) => setFilterType(e.target.value as QuestionType | '')}
            className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs bg-white"
          >
            <option value="">All types</option>
            {QUESTION_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
          </select>
          {(filterDifficulty || filterType) && (
            <button
              type="button" onClick={() => { setFilterDifficulty(''); setFilterType(''); }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

        {!isLoading && data && data.data.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {filterDifficulty || filterType ? 'No questions match these filters.' : 'No questions found in this chapter.'}
            </p>
          </div>
        )}

        {data?.data.map((q) => (
          <QuestionRow
            key={q._id}
            question={q}
            editing={editingId === q._id}
            onStartEdit={() => setEditingId(q._id)}
            onStopEdit={() => setEditingId(null)}
            onDelete={() => handleDelete(q._id)}
            deleting={deleteQuestion.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionRow({ question: q, editing, onStartEdit, onStopEdit, onDelete, deleting }: {
  question: Question;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const updateQuestion = useUpdateQuestion(q._id);
  const [edit, setEdit] = useState<EditState>(() => toEditState(q));

  function startEdit() {
    setEdit(toEditState(q));
    onStartEdit();
  }

  function patch(p: Partial<EditState>) {
    setEdit((prev) => ({ ...prev, ...p }));
  }

  const hasInvalidMcq = edit.questionType === 'mcq' && edit.options.filter((o) => o.trim()).length < 2;

  async function handleSave() {
    if (hasInvalidMcq) return;
    const payload: UpdateQuestionPayload = {
      questionText: edit.questionText,
      questionType: edit.questionType,
      difficulty: edit.difficulty,
      bloomsLevel: edit.bloomsLevel,
      marks: edit.marks === '' ? 0 : edit.marks,
      estimatedTimeMinutes: edit.estimatedTimeMinutes === '' ? 0 : edit.estimatedTimeMinutes,
      topic: edit.topic || undefined,
      options: edit.questionType === 'mcq' ? edit.options.filter((o) => o.trim()) : undefined,
      correctAnswer: edit.correctAnswer || undefined,
    };
    try {
      await updateQuestion.mutateAsync(payload);
      toast.success('Question updated');
      onStopEdit();
    } catch (err) {
      toast.error('Could not update', { description: err instanceof Error ? err.message : undefined });
    }
  }

  if (editing) {
    return (
      <div className="bg-white dark:bg-white/5 rounded-xl border border-[#6D4AFF]/40 p-3.5 space-y-2.5">
        <textarea
          value={edit.questionText} onChange={(e) => patch({ questionText: e.target.value })}
          rows={2} className="w-full text-sm text-gray-800 dark:text-white/80 border border-gray-200 dark:border-white/10 dark:bg-transparent rounded-lg p-2 resize-none"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={edit.questionType} onChange={(e) => patch({ questionType: e.target.value as QuestionType })}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
            {QUESTION_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
          </select>
          <select value={edit.difficulty} onChange={(e) => patch({ difficulty: e.target.value as QuestionDifficulty })}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
            {DIFFICULTIES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
          </select>
          <select value={edit.bloomsLevel} onChange={(e) => patch({ bloomsLevel: e.target.value as BloomsLevel })}
            className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs">
            {BLOOMS_LEVELS.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
          </select>
          <input type="number" min={0} value={edit.marks} onChange={(e) => patch({ marks: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Marks" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
          <input type="number" min={0} value={edit.estimatedTimeMinutes} onChange={(e) => patch({ estimatedTimeMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Minutes" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
          <input value={edit.topic} onChange={(e) => patch({ topic: e.target.value })}
            placeholder="Topic" className="h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs col-span-2" />
        </div>

        {edit.questionType === 'mcq' && (
          <OptionsEditor
            options={edit.options}
            correctAnswer={edit.correctAnswer}
            onChange={(options, correctAnswer) => patch({ options, correctAnswer })}
          />
        )}

        {needsCorrectAnswerField(edit.questionType) && (
          <div>
            <label className="text-[11px] font-semibold text-gray-400">Correct answer</label>
            <input
              value={edit.correctAnswer} onChange={(e) => patch({ correctAnswer: e.target.value })}
              placeholder={edit.questionType === 'true_false' ? 'True or False' : 'Correct answer'}
              className="mt-0.5 w-full h-8 px-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onStopEdit} className="h-8 px-3 rounded-lg text-xs font-semibold text-gray-500 dark:text-white/50 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            type="button" onClick={handleSave} disabled={updateQuestion.isPending || hasInvalidMcq}
            title={hasInvalidMcq ? 'Fix the MCQ options first' : undefined}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#1C2B4A] text-white flex items-center gap-1 disabled:opacity-60"
          >
            {updateQuestion.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 p-3.5 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-white/80">{q.questionText}</p>
        {q.questionType === 'mcq' && (
          (q.options?.filter((o) => o.trim()).length ?? 0) < 2 ? (
            <p className="text-xs text-red-500 font-semibold mt-1.5">⚠ Fewer than 2 options saved — this will print blank. Edit it to add options.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500 dark:text-white/50">
              {q.options!.map((opt, i) => {
                const text = stripOptionLabel(opt);
                const isCorrect = q.correctAnswer && (q.correctAnswer === opt || stripOptionLabel(q.correctAnswer) === text);
                return (
                  <span key={i} className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                    ({String.fromCharCode(97 + i)}) {text}{isCorrect ? ' ✓' : ''}
                  </span>
                );
              })}
            </div>
          )
        )}
        {q.questionType !== 'mcq' && q.correctAnswer && (
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1.5">Answer: <span className="font-medium">{q.correctAnswer}</span></p>
        )}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[q.difficulty]}`}>{q.difficulty}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.marks} mark(s)</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.questionType.replace(/_/g, ' ')}</span>
          {q.topic && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.topic}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={startEdit} className="text-gray-300 hover:text-[#6D4AFF]">
          <Pencil className="w-4 h-4" />
        </button>
        <button type="button" onClick={onDelete} disabled={deleting} className="text-gray-300 hover:text-red-500 disabled:opacity-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
