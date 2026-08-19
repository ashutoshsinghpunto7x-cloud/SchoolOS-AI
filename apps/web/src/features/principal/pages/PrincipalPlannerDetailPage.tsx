import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { usePrincipalPlannerDetail } from '@/features/teacher-planner/hooks/useTeacherPlanner';
import { PlannerView } from '@/features/teacher-planner/components/PlannerView';

export function PrincipalPlannerDetailPage() {
  const { teacherId = '', cls = '', subject = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePrincipalPlannerDetail(teacherId, cls, subject);

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">Class {cls} · {subject} — read-only</h1>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
          </div>
        ) : isError || !data ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Could not load this teacher's plan</p>
          </div>
        ) : (
          <PlannerView planner={data.planner} progress={data.progress} pace={data.pace} readOnly />
        )}
      </div>
    </div>
  );
}
