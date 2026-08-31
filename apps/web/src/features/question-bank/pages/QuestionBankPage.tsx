import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Search, FileSpreadsheet, Sparkles, Image as ImageIcon, FileText, ChevronRight, Pencil, Check, BookOpen, Trash2, X, ListChecks } from 'lucide-react';
import { useQuestionGroups, useAllQuestionSources, useUpdateSourceChapter, useDeleteSource, useDeleteQuestionGroups } from '../hooks/useQuestionBank';

function PendingUploadRow({ source }: { source: import('@schoolos/types').QuestionSource }) {
  const navigate = useNavigate();
  const updateChapter = useUpdateSourceChapter();
  const deleteSource = useDeleteSource();
  const [editing, setEditing] = useState(false);
  const [chapterName, setChapterName] = useState(source.chapterName ?? '');

  const pageCount = source.pages?.length;
  const wordCount = source.extractedText ? source.extractedText.trim().split(/\s+/).filter(Boolean).length : 0;

  async function saveChapter() {
    if (!chapterName.trim()) { setEditing(false); return; }
    try {
      await updateChapter.mutateAsync({ id: source._id, payload: { chapterName: chapterName.trim() } });
      setEditing(false);
    } catch (err) {
      toast.error('Could not update chapter', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleDelete() {
    // Irreversible (removes the converted text itself, not just a saved question) — confirm first.
    if (!window.confirm('Delete this upload? Its converted text will be gone for good — any questions already saved from it are kept.')) return;
    try {
      await deleteSource.mutateAsync(source._id);
      toast.success('Upload deleted');
    } catch (err) {
      toast.error('Could not delete upload', { description: err instanceof Error ? err.message : undefined });
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
        <span className="text-[11px] text-gray-400 shrink-0">
          {pageCount ? `${pageCount} pg · ` : ''}{wordCount.toLocaleString()} words
        </span>
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
      <button
        type="button" onClick={handleDelete} disabled={deleteSource.isPending}
        title="Delete upload" className="text-gray-300 hover:text-red-500 shrink-0 disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function QuestionBankPage() {
  const navigate = useNavigate();
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: groups, isLoading } = useQuestionGroups({ class: cls || undefined, subject: subject || undefined, search: search || undefined });
  const { data: sources } = useAllQuestionSources();
  const deleteGroups = useDeleteQuestionGroups();

  function openChapter(g: NonNullable<typeof groups>[number]) {
    const params = new URLSearchParams({ class: g.class, subject: g.subject, chapterName: g.chapterName });
    navigate(`/teacher/question-bank/chapters/${g.chapterId}?${params.toString()}`);
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleSelected(chapterId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId); else next.add(chapterId);
      return next;
    });
  }

  async function handleDeleteOne(g: NonNullable<typeof groups>[number]) {
    if (!window.confirm(`Delete "${g.chapterName}"? All ${g.count} question(s) in it will be gone for good.`)) return;
    try {
      await deleteGroups.mutateAsync([{ class: g.class, subject: g.subject, chapterId: g.chapterId }]);
      toast.success('Chapter deleted');
    } catch (err) {
      toast.error('Could not delete chapter', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleDeleteSelected() {
    if (!groups || selected.size === 0) return;
    const toDelete = groups.filter((g) => selected.has(g.chapterId));
    const totalQuestions = toDelete.reduce((sum, g) => sum + g.count, 0);
    if (!window.confirm(`Delete ${toDelete.length} chapter(s)? All ${totalQuestions} question(s) in them will be gone for good.`)) return;
    try {
      await deleteGroups.mutateAsync(toDelete.map((g) => ({ class: g.class, subject: g.subject, chapterId: g.chapterId })));
      toast.success(`${toDelete.length} chapter(s) deleted`);
      setSelected(new Set());
      setSelectMode(false);
    } catch (err) {
      toast.error('Could not delete chapters', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">Question Bank</h1>
        {groups && groups.length > 0 && (
          <button
            type="button" onClick={toggleSelectMode}
            className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${selectMode ? 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white' : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white'}`}
          >
            {selectMode ? <X className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        )}
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

      {selectMode && (
        <div className="sticky top-[57px] z-10 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20 px-5 py-2.5 flex items-center gap-3">
          <p className="flex-1 text-xs font-medium text-amber-800 dark:text-amber-300">{selected.size} chapter(s) selected</p>
          <button
            type="button" onClick={handleDeleteSelected} disabled={selected.size === 0 || deleteGroups.isPending}
            className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete selected
          </button>
        </div>
      )}

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

        {!isLoading && groups && groups.length === 0 && (!sources || sources.length === 0) && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No questions yet — upload a textbook page or past paper to get started.</p>
          </div>
        )}

        <div className="space-y-2">
          {groups?.map((g) => (
            <div
              key={`${g.class}-${g.subject}-${g.chapterId}`}
              className="w-full flex items-center gap-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 p-3.5 hover:border-gray-200 dark:hover:border-white/20 transition-colors"
            >
              {selectMode && (
                <input
                  type="checkbox" checked={selected.has(g.chapterId)} onChange={() => toggleSelected(g.chapterId)}
                  className="w-4 h-4 rounded border-gray-300 shrink-0 accent-[#1C2B4A]"
                />
              )}
              <button
                type="button"
                onClick={() => (selectMode ? toggleSelected(g.chapterId) : openChapter(g))}
                className="flex-1 flex items-center gap-3 min-w-0 text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-indigo-500 dark:text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/80 truncate">{g.chapterName}</p>
                  <p className="text-[11px] text-gray-400">Class {g.class} · {g.subject} · {g.count} question{g.count === 1 ? '' : 's'}</p>
                </div>
              </button>
              {!selectMode && (
                <button
                  type="button" onClick={() => handleDeleteOne(g)} disabled={deleteGroups.isPending}
                  title="Delete chapter" className="text-gray-300 hover:text-red-500 shrink-0 disabled:opacity-50 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {!selectMode && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
