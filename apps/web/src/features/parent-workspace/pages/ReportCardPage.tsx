import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { parentWorkspaceApi } from '../api/parent-workspace.api';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { TermReportCardDocument } from '@/features/term-report-cards/components/TermReportCardDocument';
import { EmptyState } from '@/components/ui/EmptyState';

const DOC_WIDTH_PX = 794; // 210mm at 96dpi — the document's natural rendered width

/** Scales the fixed-width A4 document down to fit whatever width is
 *  available (phones, mainly) so a parent never has to pinch-scroll
 *  sideways to read their child's report card. */
function useFitScale() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth - 16) / DOC_WIDTH_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { wrapperRef, scale };
}

export function ReportCardPage() {
  const navigate = useNavigate();
  const { activeChild, isLoading: workspaceLoading } = useParentWorkspace();
  const [printing, setPrinting] = useState(false);
  const printAreaId = `parent-report-card-print-${useId().replace(/[:]/g, '')}`;
  const { wrapperRef, scale } = useFitScale();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['parent-report-card', activeChild?._id],
    queryFn: () => parentWorkspaceApi.getReportCard(activeChild!._id),
    enabled: !!activeChild,
  });

  useEffect(() => {
    if (!printing) return;
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('afterprint', reset); };
  }, [printing]);

  const loading = workspaceLoading || (isLoading && !data);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
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

      <header className="print:hidden border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/parent/academics')}
            aria-label="Back to Academics"
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" strokeWidth={2} />
          </button>
          <p className="flex-1 min-w-0 text-lg font-bold text-gray-900 truncate">Term Report Card</p>
          {data?.available && (
            <button
              type="button"
              onClick={() => setPrinting(true)}
              className="h-11 px-4 rounded-xl bg-[#5B21B6] text-white text-sm font-semibold flex items-center gap-2 shrink-0"
            >
              <Printer className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Print / Save PDF</span>
              <span className="sm:hidden">Print</span>
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-[600px] bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      ) : !activeChild || isError || !data ? (
        <EmptyState
          icon={FileText}
          title="Could not load the report card"
          description="Please try again shortly."
        />
      ) : !data.available || !data.reportCard || !data.template || !data.student ? (
        <EmptyState
          icon={FileText}
          title="No published report card yet"
          description="The school hasn't published a term report card for your child yet. It will appear here as soon as it's ready."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="print:hidden py-6"
        >
          <div ref={wrapperRef} className="max-w-5xl mx-auto px-2 sm:px-6">
            <div
              className="mx-auto shadow-sm rounded-lg overflow-hidden bg-white"
              style={{ width: DOC_WIDTH_PX * scale, height: (DOC_WIDTH_PX * (297 / 210)) * scale }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: DOC_WIDTH_PX }}>
                <TermReportCardDocument
                  reportCard={data.reportCard}
                  template={data.template}
                  student={data.student}
                  schoolSettings={data.schoolSettings}
                  qrDataUri={data.qrDataUri}
                  hideWarnings
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {printing && data?.available && data.reportCard && data.template && data.student && (
        <div id={printAreaId} className="hidden print:block">
          <TermReportCardDocument
            reportCard={data.reportCard}
            template={data.template}
            student={data.student}
            schoolSettings={data.schoolSettings}
            qrDataUri={data.qrDataUri}
            hideWarnings
          />
        </div>
      )}
    </div>
  );
}

export default ReportCardPage;
