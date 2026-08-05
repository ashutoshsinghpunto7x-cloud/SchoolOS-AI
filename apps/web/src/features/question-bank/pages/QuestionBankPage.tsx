import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Search, Trash2, FileSpreadsheet, Sparkles, Image as ImageIcon, FileText, ChevronRight, Pencil, Check } from 'lucide-react';
import { useQuestions, useDeleteQuestion, useAllQuestionSources, useUpdateSourceChapter } from '../hooks/useQuestionBank';
import type { QuestionDifficulty } from '@schoolos/types';

const DIFFICULTY_BADGE: Record<QuestionDifficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-red-50 text-red-600',
};

function PendingUploadRow({ source }: { source: import('@schoolos/types').QuestionSource }) {
  const navigate = useNavigate();
  const updateChapter = useUpdateSourceChapter();
  const [editing, setEditing] = useState(false);
  const [chapterName, setChapterName] = useState(source.chapterName ?? '');

  async function saveChapter() {
    if (!chapterName.trim()) { setEditing(false); return; }
    try {
      await updateChapter.mutateAsync({ id: source._id, payload: { chapterName: chapterName.trim() } });
      setEditing(false);
    } catch (err) {
      toast.error('Could not update chapter', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 px-1">
      <button
        type="button" onClick={() => navigate(`/teacher/question-bank/sources/${source._id}`)}
        className="flex-1 flex items-center gap-2.5 h-10 min-w-0"
      >
        {source.kind === 'image' ? <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" /> : <FileText className="w-4 h-4 text-gray-400 shrink-0" />}
        <span className="flex-1 text-xs text-gray-600 dark:text-white/60 truncate text-left">
          {source.fileName || (source.kind === 'image' ? 'Photo upload' : 'PDF upload')}
        </span>
        <span className="text-[11px] text-gray-400 shrink-0">Class {source.class} · {source.subject}</span>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </button>
      {editing ? (
        <div className="flex items-center gap-1 shrink-0">
          <input
            autoFocus value={chapterName} onChange={(e) => setChapterName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveChapter()}
            placeholder="Chapter name" className="h-7 w-32 px-2 rounded-md border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-[11px]"
          />
          <button type="button" onClick={saveChapter} disabled={updateChapter.isPending} className="text-emerald-500 shrink-0">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-white/50 shrink-0 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10">
          {source.chapterName || 'Assign chapter'} <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function QuestionBankPage() {
  const navigate = useNavigate();
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuestions({ class: cls || undefined, subject: subject || undefined, search: search || undefined, limit: 50 });
  const { data: sources } = useAllQuestionSources();
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
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">Question Bank</h1>
        <button
          type="button" onClick={() => navigate('/teacher/question-bank/generate')}
          className="h-9 px-3 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-white flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Generate Paper
        </button>
        <button
          type="button" onClick={() => navigate('/teacher/question-bank/upload')}
          className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Class"
            className="h-9 w-24 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
            className="h-9 w-40 px-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          <div className="flex-1 min-w-[180px] relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question text, keywords, topic…"
              className="h-9 w-full pl-9 pr-3 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          </div>
        </div>

        {sources && sources.length > 0 && (
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5">
              Pending uploads — open one to generate questions
            </p>
            <div className="space-y-1">
              {sources.map((s) => <PendingUploadRow key={s._id} source={s} />)}
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

        {!isLoading && data && data.data.length === 0 && (!sources || sources.length === 0) && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No questions yet — upload a textbook page or past paper to get started.</p>
          </div>
        )}

        <div className="space-y-2.5">
          {data?.data.map((q) => (
            <div key={q._id} className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 p-3.5 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-white/80">{q.questionText}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[q.difficulty]}`}>{q.difficulty}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.marks} mark(s)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60">{q.chapterName}</span>
                  <span className="text-[10px] text-gray-400">{q.class} · {q.subject}</span>
                </div>
              </div>
              <button type="button" onClick={() => handleDelete(q._id)} className="text-gray-300 hover:text-red-500 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
