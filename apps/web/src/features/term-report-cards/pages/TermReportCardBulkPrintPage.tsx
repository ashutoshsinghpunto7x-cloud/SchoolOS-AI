import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Printer } from 'lucide-react';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { useReportCardTemplateByClassYear } from '@/features/report-card-templates/hooks/useReportCardTemplate';
import { studentsApi } from '@/features/students/api/students.api';
import type { Student, TermReportCard } from '@schoolos/types';
import { useTermReportCardRoster } from '../hooks/useTermReportCard';
import { termReportCardApi } from '../api/term-report-card.api';
import { TermReportCardDocument } from '../components/TermReportCardDocument';

interface Entry {
  student: Student;
  card: TermReportCard;
  qrDataUri?: string;
}

export function TermReportCardBulkPrintPage() {
  const { cls = '', section = '', academicYear = '' } = useParams();
  const navigate = useNavigate();
  const { data: roster, isLoading: rosterLoading } = useTermReportCardRoster(cls, section, academicYear);
  const { data: schoolSettings } = useSchoolSettings();
  const { data: template, isLoading: templateLoading } = useReportCardTemplateByClassYear(cls, academicYear);

  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!roster || entries) return;
    let cancelled = false;

    (async () => {
      const built: Entry[] = [];
      for (const row of roster.rows) {
        try {
          const [student, existingCard] = await Promise.all([
            studentsApi.getById(row.studentId),
            termReportCardApi.getByStudentYear(row.studentId, academicYear),
          ]);
          const card = existingCard ?? await termReportCardApi.generate({ studentId: row.studentId, academicYear });
          const qr = await termReportCardApi.getQrImage(card._id).catch(() => undefined);
          if (cancelled) return;
          built.push({ student, card, qrDataUri: qr?.dataUri });
          setProgress(built.length);
        } catch {
          // Skip a student whose card can't be generated (e.g. no template match) rather
          // than failing the whole class — the roster page already flags per-student issues.
        }
      }
      if (!cancelled) setEntries(built);
    })().catch((err) => setError(err instanceof Error ? err.message : 'Failed to prepare report cards'));

    return () => { cancelled = true; };
  }, [roster, entries, academicYear]);

  useEffect(() => {
    if (!printing) return;
    const reset = () => { setPrinting(false); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener('afterprint', reset); };
  }, [printing]);

  const loading = rosterLoading || templateLoading || !entries;
  const total = roster?.rows.length ?? 0;

  return (
    <div className="min-h-screen bg-[#F0F1F5] dark:bg-transparent">
      {printing && (
        <style>{`
          @page { size: A4 landscape; margin: 0; }
          @media print {
            body * { visibility: hidden; }
            #bulk-report-print-area, #bulk-report-print-area * { visibility: visible; }
            #bulk-report-print-area { position: absolute; top: 0; left: 0; }
            .term-report-print-page { break-after: page; }
            .term-report-print-page:last-child { break-after: auto; }
          }
        `}</style>
      )}

      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">Class {cls} – {section} · {academicYear} · Whole class</p>
        </div>
        <button
          type="button"
          onClick={() => setPrinting(true)}
          disabled={loading || !!error || entries?.length === 0}
          className="h-9 px-3.5 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
        >
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
      </div>

      {error ? (
        <div className="max-w-md mx-auto mt-10 px-5">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        </div>
      ) : loading ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
          <p className="text-sm text-gray-500">Preparing report cards… {progress}/{total || '?'}</p>
        </div>
      ) : entries && entries.length === 0 ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-gray-500">No report cards could be generated for this class.</p>
        </div>
      ) : (
        <div className="py-8 overflow-x-auto">
          <div className="flex flex-col gap-8 items-center" style={{ width: 'fit-content', margin: '0 auto' }}>
            {entries!.map(({ student, card, qrDataUri }) => (
              <div key={student._id} className="shadow-sm term-report-print-page">
                <TermReportCardDocument
                  reportCard={card} template={template!} student={student} schoolSettings={schoolSettings}
                  qrDataUri={qrDataUri} hideWarnings
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {printing && entries && (
        <div id="bulk-report-print-area" className="hidden print:block">
          {entries.map(({ student, card, qrDataUri }) => (
            <div key={student._id} className="term-report-print-page">
              <TermReportCardDocument
                reportCard={card} template={template!} student={student} schoolSettings={schoolSettings}
                qrDataUri={qrDataUri} hideWarnings
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
