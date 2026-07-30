import { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Trash2, Loader2, Clock } from 'lucide-react';
import { useLessonPlan, useDeleteLessonPlan } from '../hooks/useLessonPlanner';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      {children}
    </div>
  );
}

export function LessonPlanViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);
  const printAreaId = `lesson-plan-print-${useId().replace(/[:]/g, '')}`;

  const { data: plan, isLoading } = useLessonPlan(id);
  const deletePlan = useDeleteLessonPlan();

  useEffect(() => {
    if (!printing) return;
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('afterprint', reset); };
  }, [printing]);

  async function handleDelete() {
    try {
      await deletePlan.mutateAsync(id);
      toast.success('Lesson plan deleted');
      navigate(-1);
    } catch (err) {
      toast.error('Could not delete', { description: err instanceof Error ? err.message : undefined });
    }
  }

  if (isLoading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
      </div>
    );
  }

  const planDocument = (
    <div className="bg-white p-8 space-y-4" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="border-b border-gray-200 pb-3 mb-2">
        <p className="text-lg font-bold text-[#1C2B4A]">{plan.chapterName}{plan.topic ? ` — ${plan.topic}` : ''}</p>
        <p className="text-sm text-gray-500">Class {plan.class} · {plan.subject} · {plan.durationMinutes} minutes</p>
      </div>
      <Section label="Learning Objective"><p className="text-sm text-gray-800">{plan.objective}</p></Section>
      <Section label="Introduction"><p className="text-sm text-gray-800">{plan.introduction}</p></Section>
      <Section label="Explanation"><p className="text-sm text-gray-800 whitespace-pre-line">{plan.explanation}</p></Section>
      <Section label="Activities"><ul className="text-sm text-gray-800 list-disc pl-5 space-y-0.5">{plan.activities.map((a, i) => <li key={i}>{a}</li>)}</ul></Section>
      <Section label="Examples"><ul className="text-sm text-gray-800 list-disc pl-5 space-y-0.5">{plan.examples.map((e, i) => <li key={i}>{e}</li>)}</ul></Section>
      <Section label="Questions"><ul className="text-sm text-gray-800 list-disc pl-5 space-y-0.5">{plan.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></Section>
      <Section label="Homework"><p className="text-sm text-gray-800">{plan.homework}</p></Section>
      <Section label="Assessment"><p className="text-sm text-gray-800">{plan.assessment}</p></Section>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F1F5] dark:bg-transparent">
      {printing && (
        <style>{`
          @page { size: A4 portrait; margin: 0; }
          @media print {
            body * { visibility: hidden; }
            #${printAreaId}, #${printAreaId} * { visibility: visible; }
            #${printAreaId} { position: absolute; top: 0; left: 0; }
          }
        `}</style>
      )}

      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" /> {plan.durationMinutes} min
        </div>
        <button type="button" onClick={() => setPrinting(true)} className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button type="button" onClick={handleDelete} disabled={deletePlan.isPending} className="h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      <div className="py-8 overflow-x-auto">
        <div className="shadow-sm mx-auto" style={{ width: 'fit-content' }}>{planDocument}</div>
      </div>

      {printing && (
        <div id={printAreaId} className="hidden print:block">{planDocument}</div>
      )}
    </div>
  );
}
