import { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Loader2, AlertTriangle, Lightbulb, RotateCw, Trash2 } from 'lucide-react';
import { useGeneratedPaper, useDeletePaper } from '../hooks/useQuestionBank';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { PaperDocument } from '../components/PaperDocument';

export function PaperPreviewPage() {
  const { paperId = '' } = useParams();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);
  const printAreaId = `paper-print-${useId().replace(/[:]/g, '')}`;

  const { data: paper, isLoading } = useGeneratedPaper(paperId);
  const { data: schoolSettings } = useSchoolSettings();
  const deletePaper = useDeletePaper();

  async function handleDelete() {
    if (!window.confirm('Delete this question paper?')) return;
    try {
      await deletePaper.mutateAsync(paperId);
      toast.success('Paper deleted');
      navigate('/teacher/question-bank/papers');
    } catch (err) {
      toast.error('Could not delete', { description: err instanceof Error ? err.message : undefined });
    }
  }

  useEffect(() => {
    if (!printing) return;
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('afterprint', reset); };
  }, [printing]);

  if (isLoading || !paper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
        <p className="text-sm text-gray-500">Loading paper…</p>
      </div>
    );
  }

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

      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-sm font-bold text-gray-900 flex-1 truncate">{paper.config.examType} — Class {paper.config.class} {paper.config.subject}</p>
        <button
          type="button" onClick={() => navigate('/teacher/question-bank/generate', { state: { prefillConfig: paper.config } })}
          className="h-9 px-3 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 flex items-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" /> Regenerate
        </button>
        <button
          type="button" onClick={handleDelete} disabled={deletePaper.isPending}
          className="h-9 px-3 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-red-600 flex items-center gap-1.5 disabled:opacity-50"
        >
          {deletePaper.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
        </button>
        <button type="button" onClick={() => setPrinting(true)} className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
      </div>

      {(paper.validation.warnings.length > 0 || paper.validation.suggestions.length > 0) && (
        <div className="print:hidden max-w-3xl mx-auto mt-4 px-5 space-y-3">
          {paper.validation.warnings.length > 0 && (
            <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Review before printing</p>
                <ul className="text-xs text-amber-700 mt-1 list-disc pl-4">
                  {paper.validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}
          {paper.validation.suggestions.length > 0 && (
            <div className="rounded-xl p-3.5 bg-blue-50 border border-blue-200 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-800">Suggestions</p>
                <ul className="text-xs text-blue-700 mt-1 list-disc pl-4">
                  {paper.validation.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Coverage: {paper.validation.coveragePercent}% of selected chapters · Estimated time: {paper.validation.totalEstimatedTimeMinutes} min
          </p>
        </div>
      )}

      <div className="py-8 overflow-x-auto">
        <div className="shadow-sm mx-auto" style={{ width: 'fit-content' }}>
          <PaperDocument paper={paper} schoolSettings={schoolSettings} />
        </div>
      </div>

      {printing && (
        <div id={printAreaId} className="hidden print:block">
          <PaperDocument paper={paper} schoolSettings={schoolSettings} />
        </div>
      )}
    </div>
  );
}
