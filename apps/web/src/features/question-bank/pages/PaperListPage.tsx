import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Files, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { usePapers, useDeletePaper } from '../hooks/useQuestionBank';

/** Browse previously generated question papers for a class/subject — any teacher's, not just
 * whoever created them, so a newly-assigned teacher can still find a predecessor's papers. */
export function PaperListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [cls, setCls] = useState(params.get('class') ?? '');
  const [subject, setSubject] = useState(params.get('subject') ?? '');

  const filtersSet = Boolean(cls.trim() && subject.trim());
  const { data, isLoading } = usePapers(filtersSet ? { class: cls.trim(), subject: subject.trim(), limit: 50 } : { limit: 50 });
  const deletePaper = useDeletePaper();

  function applyFilters() {
    setParams(cls.trim() && subject.trim() ? { class: cls.trim(), subject: subject.trim() } : {});
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm('Delete this question paper?')) return;
    try {
      await deletePaper.mutateAsync(id);
      toast.success('Paper deleted');
    } catch (err) {
      toast.error('Could not delete', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">Question Papers</h1>
        <button
          type="button" onClick={() => navigate('/teacher/question-bank/generate')}
          className="h-8 px-3 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold"
        >
          Generate new
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-3 flex items-center gap-2">
          <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Class"
            className="w-24 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
            className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-xs" />
          <button type="button" onClick={applyFilters} className="h-8 px-3 rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-semibold text-gray-700 dark:text-white">
            Filter
          </button>
        </div>

        {isLoading ? (
          <div className="h-20 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />
        ) : !data || data.data.length === 0 ? (
          <div className="text-center py-16">
            <Files className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {filtersSet ? 'No papers yet for this class/subject.' : 'No papers generated yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.data.map((p) => (
              <div
                key={p._id} role="button" tabIndex={0}
                onClick={() => navigate(`/teacher/question-bank/papers/${p._id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/teacher/question-bank/papers/${p._id}`); }}
                className="w-full text-left flex items-center gap-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm px-4 py-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {p.config.examType} — Class {p.config.class} · {p.config.subject}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {p.totalMarksAssembled} marks · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button" onClick={(e) => handleDelete(p._id, e)} disabled={deletePaper.isPending}
                  className="text-gray-300 hover:text-red-500 disabled:opacity-50 shrink-0"
                >
                  {deletePaper.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
