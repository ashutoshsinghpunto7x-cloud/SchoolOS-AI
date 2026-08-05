import { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Sparkles, Smartphone, Monitor, Loader2, AlertTriangle, CheckCircle2, Send, Pencil } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useStudent } from '@/features/students/hooks/useStudents';
import { useExam } from '@/features/marks/hooks/useExams';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import {
  useReportCardByExamStudent, useGenerateReportCard, useReportCardQr,
  useUpdateReportCard, useRegenerateRemark, usePublishReportCard,
} from '../hooks/useReportCard';
import { ReportCardDocument } from '../components/ReportCardDocument';
import { ReportCardMobileView } from '../components/ReportCardMobileView';

export function ReportCardPreviewPage() {
  const { examId = '', studentId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Publishing — and every other field except subject marks — is admin/principal-only on the
  // backend (see report-card.service.ts's update()); teachers can only correct marks directly on
  // the card, so remark editing and publishing are hidden for them here rather than 403ing.
  const canPublish = user?.role === 'admin' || user?.role === 'principal';
  const isLeadership = canPublish;
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [printing, setPrinting] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState<string | null>(null);
  const [editingMarks, setEditingMarks] = useState(false);
  const printAreaId = `report-card-print-${useId().replace(/[:]/g, '')}`;

  const { data: student, isLoading: studentLoading } = useStudent(studentId);
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: schoolSettings } = useSchoolSettings();
  const { data: existingCard, isLoading: cardLoading, isFetched } = useReportCardByExamStudent(examId, studentId);
  const generate = useGenerateReportCard();
  const { data: qr } = useReportCardQr(existingCard?._id ?? '');

  const card = existingCard;
  const updateCard = useUpdateReportCard(card?._id ?? '');
  const regenerateRemark = useRegenerateRemark(card?._id ?? '');
  const publish = usePublishReportCard(card?._id ?? '');

  // Auto-generate on first visit if no report card exists yet for this student+exam.
  useEffect(() => {
    if (isFetched && !existingCard && !generate.isPending && !generate.isSuccess) {
      generate.mutate({ examId, studentId });
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

  const loading = studentLoading || examLoading || cardLoading || (!resolvedCard && generate.isPending);

  if (loading || !student || !exam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF]">
        <Loader2 className="w-6 h-6 text-[#6D4AFF] animate-spin" />
        <p className="text-sm text-gray-500">{generate.isPending ? 'Generating report card with AI…' : 'Loading…'}</p>
      </div>
    );
  }

  if (!resolvedCard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAFBFF] px-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm font-semibold text-gray-700">Couldn't generate this report card</p>
        <button type="button" onClick={() => generate.mutate({ examId, studentId })} className="mt-2 h-9 px-4 rounded-lg bg-[#1C2B4A] text-white text-sm font-semibold">
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

      {/* Toolbar — screen only */}
      <div className="print:hidden sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} type="button" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{student.fullName} · {exam.name}</p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button" onClick={() => setView('desktop')}
            className={`h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 ${view === 'desktop' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            <Monitor className="w-3.5 h-3.5" /> A4 / Print
          </button>
          <button
            type="button" onClick={() => setView('mobile')}
            className={`h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 ${view === 'mobile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Parent Mobile View
          </button>
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

      {/* Warnings — screen only */}
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

      {/* Marks correction — screen only, available to teachers and leadership alike; every other
          edit below this is leadership-only (see isLeadership gating). */}
      <div className="print:hidden max-w-3xl mx-auto mt-4 px-5">
        <MarksCorrectionPanel
          card={resolvedCard}
          editing={editingMarks}
          onToggle={() => setEditingMarks((v) => !v)}
          onSave={(subjectMarks) => { updateCard.mutate({ subjectMarks }); setEditingMarks(false); }}
          saving={updateCard.isPending}
        />
      </div>

      {/* AI remark editor — screen only, leadership-only (teachers can't touch remarks) */}
      {isLeadership && (
        <div className="print:hidden max-w-3xl mx-auto mt-4 px-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6D4AFF]" /> AI Remark
              </p>
              <button
                type="button"
                onClick={() => regenerateRemark.mutate()}
                disabled={regenerateRemark.isPending}
                className="text-xs font-semibold text-[#6D4AFF] disabled:opacity-50"
              >
                {regenerateRemark.isPending ? 'Regenerating…' : 'Regenerate'}
              </button>
            </div>
            <textarea
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/30"
              rows={3}
              value={remarkDraft ?? resolvedCard.aiRemark?.text ?? ''}
              onChange={(e) => setRemarkDraft(e.target.value)}
            />
            {remarkDraft !== null && remarkDraft !== resolvedCard.aiRemark?.text && (
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setRemarkDraft(null)} className="h-8 px-3 rounded-lg text-xs font-semibold text-gray-500">Cancel</button>
                <button
                  type="button"
                  onClick={() => { updateCard.mutate({ aiRemarkText: remarkDraft }); setRemarkDraft(null); }}
                  disabled={updateCard.isPending}
                  className="h-8 px-3 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold disabled:opacity-60"
                >
                  Save remark
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document */}
      <div className="py-8 overflow-x-auto">
        {view === 'desktop' ? (
          <div className="shadow-sm mx-auto" style={{ width: 'fit-content' }}>
            <ReportCardDocument
              reportCard={resolvedCard} student={student} exam={exam} schoolSettings={schoolSettings}
              qrDataUri={qr?.dataUri} hideWarnings={false}
            />
          </div>
        ) : (
          <ReportCardMobileView reportCard={resolvedCard} student={student} exam={exam} schoolSettings={schoolSettings} onDownload={() => setPrinting(true)} />
        )}
      </div>

      {/* Print-only copy — always the A4 document regardless of on-screen view */}
      {printing && (
        <div id={printAreaId} className="hidden print:block">
          <ReportCardDocument reportCard={resolvedCard} student={student} exam={exam} schoolSettings={schoolSettings} qrDataUri={qr?.dataUri} hideWarnings />
        </div>
      )}
    </div>
  );
}

/**
 * Lets a teacher fix a wrong mark/grade directly on the generated card, without going back
 * through the marks-entry flow — the one edit teachers are allowed to make (everything else on
 * the card is leadership-only, see report-card.service.ts's update()).
 */
function MarksCorrectionPanel({
  card, editing, onToggle, onSave, saving,
}: {
  card: import('@schoolos/types').ReportCard;
  editing: boolean;
  onToggle: () => void;
  onSave: (subjectMarks: import('@schoolos/types').SubjectMarkCorrection[]) => void;
  saving: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, { marksObtained: string; grade: string }>>({});

  function startEditing() {
    const initial: Record<string, { marksObtained: string; grade: string }> = {};
    for (const s of card.subjects) {
      initial[s.subjectName] = { marksObtained: s.marksObtained?.toString() ?? '', grade: s.grade ?? '' };
    }
    setDrafts(initial);
    onToggle();
  }

  function save() {
    const subjectMarks: import('@schoolos/types').SubjectMarkCorrection[] = [];
    for (const s of card.subjects) {
      const draft = drafts[s.subjectName];
      if (!draft) continue;
      const showMarks = s.evaluationType === 'marks' || s.evaluationType === 'both';
      const showGrade = s.evaluationType === 'grade' || s.evaluationType === 'both';
      const marksObtained = showMarks && draft.marksObtained.trim() !== '' ? Number(draft.marksObtained) : undefined;
      const grade = showGrade && draft.grade.trim() !== '' ? draft.grade.trim() : undefined;
      if (marksObtained === undefined && grade === undefined) continue;
      const correction: import('@schoolos/types').SubjectMarkCorrection = { subjectName: s.subjectName };
      if (marksObtained !== undefined) correction.marksObtained = marksObtained;
      if (grade !== undefined) correction.grade = grade;
      subjectMarks.push(correction);
    }
    onSave(subjectMarks);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5 text-[#1C2B4A]" /> Correct Marks
        </p>
        {!editing && (
          <button type="button" onClick={startEditing} className="text-xs font-semibold text-[#6D4AFF]">
            Fix a mark
          </button>
        )}
      </div>

      {!editing ? (
        <p className="text-xs text-gray-400">Entered a mark wrong? Click "Fix a mark" to correct it right here — no need to redo the marks-entry flow.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {card.subjects.map((s) => {
              const showMarks = s.evaluationType === 'marks' || s.evaluationType === 'both';
              const showGrade = s.evaluationType === 'grade' || s.evaluationType === 'both';
              const draft = drafts[s.subjectName] ?? { marksObtained: '', grade: '' };
              return (
                <div key={s.subjectName} className="flex items-center gap-2.5">
                  <span className="flex-1 text-xs text-gray-700 truncate">{s.subjectName}</span>
                  {showMarks && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={s.maxMarks}
                        value={draft.marksObtained}
                        onChange={(e) => setDrafts((d) => ({ ...d, [s.subjectName]: { ...draft, marksObtained: e.target.value } }))}
                        className="h-8 w-16 px-2 rounded-md border border-gray-200 text-xs text-right"
                      />
                      <span className="text-[10px] text-gray-400">/ {s.maxMarks ?? '—'}</span>
                    </div>
                  )}
                  {showGrade && (
                    <input
                      value={draft.grade}
                      onChange={(e) => setDrafts((d) => ({ ...d, [s.subjectName]: { ...draft, grade: e.target.value } }))}
                      placeholder="Grade"
                      className="h-8 w-14 px-2 rounded-md border border-gray-200 text-xs text-center"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={onToggle} className="h-8 px-3 rounded-lg text-xs font-semibold text-gray-500">Cancel</button>
            <button
              type="button" onClick={save} disabled={saving}
              className="h-8 px-3 rounded-lg bg-[#1C2B4A] text-white text-xs font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save corrections'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
