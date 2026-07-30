import { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Trash2, Loader2 } from 'lucide-react';
import { useWorksheet, useDeleteWorksheet } from '../hooks/useWorksheetGenerator';

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WorksheetViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);
  const printAreaId = `worksheet-print-${useId().replace(/[:]/g, '')}`;

  const { data: worksheet, isLoading } = useWorksheet(id);
  const deleteWorksheet = useDeleteWorksheet();

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
      await deleteWorksheet.mutateAsync(id);
      toast.success('Worksheet deleted');
      navigate(-1);
    } catch (err) {
      toast.error('Could not delete', { description: err instanceof Error ? err.message : undefined });
    }
  }

  if (isLoading || !worksheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
      </div>
    );
  }

  const worksheetDocument = (
    <div className="bg-white p-8 space-y-4" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="border-b border-gray-200 pb-3 mb-2">
        <p className="text-lg font-bold text-[#1C2B4A]">{worksheet.title}</p>
        <p className="text-sm text-gray-500">Class {worksheet.class} · {worksheet.subject} · {worksheet.chapterNames.join(', ')}</p>
        <p className="text-xs text-gray-400 mt-1">Name: _______________________  Date: ____________</p>
      </div>
      <div className="space-y-4">
        {worksheet.questions.map((q, i) => (
          <div key={i} className="text-sm">
            <p><strong>Q{i + 1}.</strong> {q.questionText}</p>
            {q.questionType === 'mcq' && q.options && (
              <div className="grid grid-cols-2 gap-x-4 mt-1 pl-5 text-xs text-gray-700">
                {q.options.map((opt, oi) => <span key={oi}>({String.fromCharCode(97 + oi)}) {opt}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
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
        <p className="flex-1 min-w-0 truncate text-sm font-bold text-gray-900">{worksheet.title}</p>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{labelize(worksheet.worksheetType)}</span>
        <button type="button" onClick={() => setPrinting(true)} className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button type="button" onClick={handleDelete} disabled={deleteWorksheet.isPending} className="h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      <div className="py-8 overflow-x-auto">
        <div className="shadow-sm mx-auto" style={{ width: 'fit-content' }}>{worksheetDocument}</div>
      </div>

      {printing && (
        <div id={printAreaId} className="hidden print:block">{worksheetDocument}</div>
      )}
    </div>
  );
}
