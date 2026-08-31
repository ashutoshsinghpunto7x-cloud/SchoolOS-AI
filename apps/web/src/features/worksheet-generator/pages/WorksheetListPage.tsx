import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileEdit, ChevronRight, Clock } from 'lucide-react';
import { useWorksheets } from '../hooks/useWorksheetGenerator';

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Reused two ways: `/worksheet-generator/my` (this teacher's own, no class/subject) and
 * `/worksheet-generator/:cls/:subject/list` (everything saved for that class/subject, regardless
 * of who created it — so a newly-assigned teacher can still find a predecessor's worksheets). */
export function WorksheetListPage() {
  const navigate = useNavigate();
  const { cls, subject } = useParams<{ cls?: string; subject?: string }>();
  const scoped = Boolean(cls && subject);
  const { data, isLoading } = useWorksheets(scoped ? { class: cls, subject, limit: 50 } : { limit: 50 });

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">
          {scoped ? `Worksheets — Class ${cls} · ${subject}` : 'My Worksheets'}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-3">
        {isLoading ? (
          <div className="h-20 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />
        ) : !data || data.data.length === 0 ? (
          <div className="text-center py-16">
            <FileEdit className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No worksheets yet — generate one from a class/subject.</p>
          </div>
        ) : (
          data.data.map((w) => (
            <button
              key={w._id} type="button" onClick={() => navigate(`/teacher/worksheet-generator/view/${w._id}`)}
              className="w-full text-left flex items-center gap-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{w.title}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" /> {w.questions.length} question(s) · {labelize(w.worksheetType)}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
