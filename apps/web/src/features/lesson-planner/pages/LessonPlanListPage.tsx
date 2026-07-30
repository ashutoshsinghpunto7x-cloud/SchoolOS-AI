import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, BookText, ChevronRight, Clock } from 'lucide-react';
import { useLessonPlans } from '../hooks/useLessonPlanner';

export function LessonPlanListPage() {
  const { cls = '', subject = '', chapterId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const chapterName = searchParams.get('chapterName') ?? '';
  const navigate = useNavigate();

  const { data, isLoading } = useLessonPlans({ chapterId, class: cls, subject, limit: 50 });

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1 truncate">{chapterName || 'Chapter'}</h1>
        <button
          type="button"
          onClick={() => navigate(`/teacher/lesson-planner/${cls}/${encodeURIComponent(subject)}/${chapterId}/generate?chapterName=${encodeURIComponent(chapterName)}`)}
          className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Generate New
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-3">
        {isLoading ? (
          <div className="h-20 rounded-2xl bg-white teacher-glass-card shadow-sm animate-pulse" />
        ) : !data || data.data.length === 0 ? (
          <div className="text-center py-16">
            <BookText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No lesson plans yet for this chapter — generate one to get started.</p>
          </div>
        ) : (
          data.data.map((plan) => (
            <button
              key={plan._id} type="button" onClick={() => navigate(`/teacher/lesson-planner/plan/${plan._id}`)}
              className="w-full text-left flex items-center gap-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{plan.objective}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" /> {plan.durationMinutes} min
                  {plan.topic && <span>· {plan.topic}</span>}
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
