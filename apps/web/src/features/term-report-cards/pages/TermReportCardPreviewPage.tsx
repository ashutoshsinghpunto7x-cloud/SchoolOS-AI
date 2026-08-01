import { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useStudent } from '@/features/students/hooks/useStudents';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { useReportCardTemplateByClassYear } from '@/features/report-card-templates/hooks/useReportCardTemplate';
import {
  useTermReportCardByStudentYear, useGenerateTermReportCard, useTermReportCardQr,
  useUpdateTermReportCard, usePublishTermReportCard,
} from '../hooks/useTermReportCard';
import { TermReportCardDocument } from '../components/TermReportCardDocument';

export function TermReportCardPreviewPage() {
  const { cls = '', academicYear = '', studentId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canPublish = user?.role === 'admin' || user?.role === 'principal';
  const [printing, setPrinting] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState<string | null>(null);
  const printAreaId = `term-report-card-print-${useId().replace(/[:]/g, '')}`;

  const { data: student, isLoading: studentLoading } = useStudent(studentId);
  const { data: schoolSettings } = useSchoolSettings();
  const { data: template, isLoading: templateLoading } = useReportCardTemplateByClassYear(cls, academicYear);
  const { data: existingCard, isLoading: cardLoading, isFetched } = useTermReportCardByStudentYear(studentId, academicYear);
  const generate = useGenerateTermReportCard();
  const { data: qr } = useTermReportCardQr(existingCard?._id ?? '');

  const card = existingCard;
  const updateCard = useUpdateTermReportCard(card?._id ?? '');
  const publish = usePublishTermReportCard(card?._id ?? '');

  useEffect(() => {
    if (isFetched && !existingCard && !generate.isPending && !generate.isSuccess) {
      generate.mutate({ studentId, academicYear });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetched, existingCard]);

  const resolvedCard = card ?? generate.data;

  useEffect(() => {
    if (!printing) return;
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('afterprint', reset); };
  }, [printing]);

  const loading = studentLoading || templateLoading || cardLoading || (!resolvedCard && generate.isPending);

  if (loading || !student || !template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
        <p className="text-sm text-gray-500">{generate.isPending ? 'Generating report card…' : 'Loading…'}</p>
      </div>
    );
  }

  if (!resolvedCard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF] px-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm font-semibold text-gray-700">Couldn't generate this report card</p>
        <p className="text-xs text-gray-500 max-w-sm">{generate.error instanceof Error ? generate.error.message : 'Make sure the report card template for this class is published.'}</p>
        <button type="button" onClick={() => generate.mutate({ studentId, academicYear })} className="mt-2 h-9 px-4 rounded-lg bg-[#1C2B4A] text-white text-sm font-semibold">
          Try again
        </button>
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{student.fullName} · {academicYear}</p>
        </div>

        <button type="button" onClick={() => setPrinting(true)} className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
        {resolvedCard.status === 'draft' && canPublish && (
          <button
            type="button" onClick={() => publish.mutate()} disabled={publish.isPending}
            className="h-9 px-3.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" /> {publish.isPending ? 'Publishing…' : 'Publish'}
          </button>
        )}
        {resolvedCard.status === 'published' && (
          <span className="h-9 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Published
          </span>
        )}
      </div>

      {resolvedCard.warnings.length > 0 && (
        <div className="print:hidden max-w-3xl mx-auto mt-4 px-5">
          <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Review before publishing</p>
              <ul className="text-xs text-amber-700 mt-1 list-disc pl-4">
                {resolvedCard.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="print:hidden max-w-3xl mx-auto mt-4 px-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Class Teacher's Remark</p>
          <textarea
            className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/30"
            rows={3}
            value={remarkDraft ?? resolvedCard.teacherRemark ?? ''}
            onChange={(e) => setRemarkDraft(e.target.value)}
          />
          {remarkDraft !== null && remarkDraft !== resolvedCard.teacherRemark && (
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setRemarkDraft(null)} className="h-8 px-3 rounded-lg text-xs font-semibold text-gray-500">Cancel</button>
              <button
                type="button"
                onClick={() => { updateCard.mutate({ teacherRemark: remarkDraft }); setRemarkDraft(null); }}
                disabled={updateCard.isPending}
                className="h-8 px-3 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold disabled:opacity-60"
              >
                Save remark
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="py-8 overflow-x-auto">
        <div className="shadow-sm mx-auto" style={{ width: 'fit-content' }}>
          <TermReportCardDocument
            reportCard={resolvedCard} template={template} student={student} schoolSettings={schoolSettings}
            qrDataUri={qr?.dataUri} hideWarnings={false}
          />
        </div>
      </div>

      {printing && (
        <div id={printAreaId} className="hidden print:block">
          <TermReportCardDocument reportCard={resolvedCard} template={template} student={student} schoolSettings={schoolSettings} qrDataUri={qr?.dataUri} hideWarnings />
        </div>
      )}
    </div>
  );
}
