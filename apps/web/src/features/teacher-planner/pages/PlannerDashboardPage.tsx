import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CalendarClock, Pencil, Loader2 } from 'lucide-react';
import { useMyPlanner, usePlannerProgress, usePlannerPace, useUpdateTask } from '../hooks/useTeacherPlanner';
import { PlannerView } from '../components/PlannerView';
import type { UpdateTaskPayload } from '@schoolos/types';

export function PlannerDashboardPage() {
  const { cls = '', subject = '' } = useParams();
  const navigate = useNavigate();

  const { data: planner, isLoading: plannerLoading } = useMyPlanner(cls, subject);
  const plannerId = planner?._id ?? '';
  const { data: progress, isLoading: progressLoading } = usePlannerProgress(plannerId);
  const { data: pace, isLoading: paceLoading } = usePlannerPace(plannerId);
  const updateTask = useUpdateTask(plannerId);

  async function handleToggle(taskId: string, current: 'pending' | 'completed') {
    try {
      await updateTask.mutateAsync({ taskId, status: current === 'completed' ? 'pending' : 'completed' });
    } catch (err) {
      toast.error('Could not update task', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleEdit(taskId: string, patch: UpdateTaskPayload) {
    try {
      await updateTask.mutateAsync({ taskId, ...patch });
    } catch (err) {
      toast.error('Could not save task', { description: err instanceof Error ? err.message : undefined });
    }
  }

  if (plannerLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
      </div>
    );
  }

  if (!planner) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent">
        <div className="px-5 pt-6 pb-4 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 -ml-1 p-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-white teacher-glass-card rounded-2xl border border-gray-100 dark:border-transparent p-10 text-center">
            <CalendarClock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700 dark:text-white/80">No planner yet for Class {cls} {subject}</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Pick chapters and a duration to build your plan.</p>
            <button
              type="button"
              onClick={() => navigate(`/teacher/planner/${cls}/${encodeURIComponent(subject)}/build`)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1C2B4A] text-white text-sm font-semibold"
            >
              <CalendarClock className="w-4 h-4" /> Build Planner
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] dark:bg-transparent pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/40 backdrop-blur border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-white/50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-1">Class {cls} · {subject}</h1>
        <button
          type="button" onClick={() => navigate(`/teacher/planner/${cls}/${encodeURIComponent(subject)}/build`)}
          className="h-9 px-3 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-white flex items-center gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit Plan
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {progressLoading || paceLoading || !progress || !pace ? (
          <div className="space-y-3">
            <div className="h-24 bg-gray-50 dark:bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-16 bg-gray-50 dark:bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <PlannerView planner={planner} progress={progress} pace={pace} onToggleTask={handleToggle} onEditTask={handleEdit} />
        )}
      </div>
    </div>
  );
}
