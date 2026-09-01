import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, BookOpen, Check } from 'lucide-react';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import { useChapters } from '@/features/question-bank/hooks/useQuestionBank';
import { useUpdateChapterSizing } from '@/features/academic-plan/hooks/useAcademicPlan';
import type { ChapterDifficulty, ChapterPriority, SyllabusChapter } from '@schoolos/types';

const DIFFICULTIES: ChapterDifficulty[] = ['easy', 'moderate', 'hard'];
const PRIORITIES: ChapterPriority[] = ['core', 'important', 'supplementary'];

interface RowDraft {
  estimatedPeriods: string;
  difficulty: ChapterDifficulty | '';
  priority: ChapterPriority | '';
  revisionWeight: string;
}

function draftOf(c: SyllabusChapter): RowDraft {
  return {
    estimatedPeriods: c.estimatedPeriods?.toString() ?? '',
    difficulty: c.difficulty ?? '',
    priority: c.priority ?? '',
    revisionWeight: c.revisionWeight?.toString() ?? '',
  };
}

export function CoordinatorSyllabusPage() {
  const navigate = useNavigate();
  const { data: schoolClasses } = useSchoolClasses();
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [subjectQuery, setSubjectQuery] = useState('');

  const { data: chapters, isLoading, isFetching } = useChapters(cls, subjectQuery);
  const updateSizing = useUpdateChapterSizing();
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!chapters) return;
    setDrafts(Object.fromEntries(chapters.map((c) => [c._id, draftOf(c)])));
  }, [chapters]);

  function updateDraft(id: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSave(chapterId: string) {
    const draft = drafts[chapterId];
    if (!draft) return;
    try {
      await updateSizing.mutateAsync({
        chapterId,
        payload: {
          estimatedPeriods: draft.estimatedPeriods ? Number(draft.estimatedPeriods) : undefined,
          difficulty: draft.difficulty || undefined,
          priority: draft.priority || undefined,
          revisionWeight: draft.revisionWeight ? Number(draft.revisionWeight) : undefined,
        },
      });
      setSavedId(chapterId);
      setTimeout(() => setSavedId((id) => (id === chapterId ? null : id)), 1500);
    } catch (err) {
      toast.error('Could not save chapter', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="px-6 pt-6 pb-4 max-w-4xl mx-auto">
        <button onClick={() => navigate('/coordinator')} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-[26px] sm:text-[32px] font-bold text-gray-900 tracking-tight leading-none">Syllabus Setup</h1>
        <p className="text-base text-gray-500 mt-2 max-w-xl">
          Size each chapter — the Academic Planning Engine distributes teaching days by estimated periods and priority instead of splitting the term evenly.
        </p>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-gray-500">Class</label>
              <select value={cls} onChange={(e) => setCls(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm">
                <option value="">Select class</option>
                {(schoolClasses ?? []).map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Science"
                className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
            </div>
            <button
              type="button" disabled={!cls || !subject.trim()}
              onClick={() => setSubjectQuery(subject.trim())}
              className="h-10 px-5 rounded-lg bg-[#1C2B4A] text-white text-sm font-bold disabled:opacity-40"
            >
              Load chapters
            </button>
          </div>
        </div>

        <div className="mt-5">
          {!cls || !subjectQuery ? null : isLoading || isFetching ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" /></div>
          ) : (chapters ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No chapters found for Class {cls} · {subjectQuery}</p>
              <p className="text-xs text-gray-400 mt-1">Chapters are created from Question Bank chapter capture uploads.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(chapters ?? []).map((c) => {
                const draft = drafts[c._id] ?? draftOf(c);
                const saving = updateSizing.isPending && updateSizing.variables?.chapterId === c._id;
                return (
                  <div key={c._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-sm font-bold text-gray-900 mb-3">{c.chapterName}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500">Periods</label>
                        <input type="number" min={1} value={draft.estimatedPeriods}
                          onChange={(e) => updateDraft(c._id, { estimatedPeriods: e.target.value })}
                          className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500">Difficulty</label>
                        <select value={draft.difficulty} onChange={(e) => updateDraft(c._id, { difficulty: e.target.value as ChapterDifficulty })}
                          className="mt-1 w-full h-9 px-2 rounded-lg border border-gray-200 text-sm capitalize">
                          <option value="">—</option>
                          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500">Priority</label>
                        <select value={draft.priority} onChange={(e) => updateDraft(c._id, { priority: e.target.value as ChapterPriority })}
                          className="mt-1 w-full h-9 px-2 rounded-lg border border-gray-200 text-sm capitalize">
                          <option value="">—</option>
                          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500">Revision wt.</label>
                        <input type="number" min={1} max={5} value={draft.revisionWeight}
                          onChange={(e) => updateDraft(c._id, { revisionWeight: e.target.value })}
                          className="mt-1 w-full h-9 px-2.5 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <button
                        type="button" disabled={saving} onClick={() => handleSave(c._id)}
                        className="h-9 rounded-lg bg-gray-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedId === c._id ? <Check className="w-3.5 h-3.5" /> : null}
                        {savedId === c._id ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
