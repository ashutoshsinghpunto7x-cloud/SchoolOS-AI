import { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, AlertTriangle, CheckCircle2, Send, Pencil } from 'lucide-react';
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
  const [editingMarks, setEditingMarks] = useState(false);
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

      {/* Marks correction — screen only, available to teachers and leadership alike. Every other
          field (principal remark, parent feedback, template structure) is leadership-only. */}
      <div className="print:hidden max-w-3xl mx-auto mt-4 px-5">
        <MarksCorrectionPanel
          card={resolvedCard}
          editing={editingMarks}
          onToggle={() => setEditingMarks((v) => !v)}
          onSave={(subjectMarks) => { updateCard.mutate({ subjectMarks }); setEditingMarks(false); }}
          saving={updateCard.isPending}
        />
      </div>

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

type DraftRow = {
  unitTest1Score: string; unitTest2Score: string; mainExamScore: string; grade: string;
  evaluationType: import('@schoolos/types').SubjectEvaluationType;
};
type TermKey = 'firstTerm' | 'finalTerm';
const TERM_LABEL: Record<TermKey, string> = { firstTerm: 'First Term', finalTerm: 'Final Term' };
const EVAL_TYPE_OPTIONS: { value: import('@schoolos/types').SubjectEvaluationType; label: string }[] = [
  { value: 'marks', label: 'Marks' },
  { value: 'grade', label: 'Grade only' },
  { value: 'both', label: 'Marks + Grade' },
];

/**
 * Lets a teacher fix a wrong score directly on the generated term card, without going back
 * through the marks-entry flow — the one edit teachers are allowed to make on either term block.
 */
function MarksCorrectionPanel({
  card, editing, onToggle, onSave, saving,
}: {
  card: import('@schoolos/types').TermReportCard;
  editing: boolean;
  onToggle: () => void;
  onSave: (subjectMarks: import('@schoolos/types').TermSubjectMarkCorrection[]) => void;
  saving: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});

  function keyFor(term: TermKey, subjectName: string) { return `${term}::${subjectName}`; }

  function startEditing() {
    const initial: Record<string, DraftRow> = {};
    (['firstTerm', 'finalTerm'] as TermKey[]).forEach((term) => {
      for (const row of card[term].subjectRows) {
        initial[keyFor(term, row.subjectName)] = {
          unitTest1Score: row.unitTest1Score?.toString() ?? '',
          unitTest2Score: row.unitTest2Score?.toString() ?? '',
          mainExamScore: row.mainExamScore?.toString() ?? '',
          grade: row.grade ?? '',
          evaluationType: row.evaluationType,
        };
      }
    });
    setDrafts(initial);
    onToggle();
  }

  function save() {
    const subjectMarks: import('@schoolos/types').TermSubjectMarkCorrection[] = [];
    (['firstTerm', 'finalTerm'] as TermKey[]).forEach((term) => {
      for (const row of card[term].subjectRows) {
        const draft = drafts[keyFor(term, row.subjectName)];
        if (!draft) continue;
        const showMarks = draft.evaluationType === 'marks' || draft.evaluationType === 'both';
        const showGrade = draft.evaluationType === 'grade' || draft.evaluationType === 'both';
        const unitTest1Score = showMarks && draft.unitTest1Score.trim() !== '' ? Number(draft.unitTest1Score) : undefined;
        const unitTest2Score = showMarks && draft.unitTest2Score.trim() !== '' ? Number(draft.unitTest2Score) : undefined;
        const mainExamScore = showMarks && draft.mainExamScore.trim() !== '' ? Number(draft.mainExamScore) : undefined;
        const grade = showGrade && draft.grade.trim() !== '' ? draft.grade.trim() : undefined;
        const evaluationTypeChanged = draft.evaluationType !== row.evaluationType;
        if (unitTest1Score === undefined && unitTest2Score === undefined && mainExamScore === undefined && grade === undefined && !evaluationTypeChanged) continue;
        const correction: import('@schoolos/types').TermSubjectMarkCorrection = { term, subjectName: row.subjectName };
        if (unitTest1Score !== undefined) correction.unitTest1Score = unitTest1Score;
        if (unitTest2Score !== undefined) correction.unitTest2Score = unitTest2Score;
        if (mainExamScore !== undefined) correction.mainExamScore = mainExamScore;
        if (grade !== undefined) correction.grade = grade;
        if (evaluationTypeChanged) correction.evaluationType = draft.evaluationType;
        subjectMarks.push(correction);
      }
    });
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
        <p className="text-xs text-gray-400">Entered a score wrong? Click "Fix a mark" to correct it right here — no need to redo the marks-entry flow.</p>
      ) : (
        <>
          {(['firstTerm', 'finalTerm'] as TermKey[]).map((term) => (
            <div key={term} className="mb-4 last:mb-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{TERM_LABEL[term]}</p>
              <div className="space-y-1.5">
                {card[term].subjectRows.map((row) => {
                  const k = keyFor(term, row.subjectName);
                  const draft = drafts[k] ?? { unitTest1Score: '', unitTest2Score: '', mainExamScore: '', grade: '', evaluationType: row.evaluationType };
                  const showMarks = draft.evaluationType === 'marks' || draft.evaluationType === 'both';
                  const showGrade = draft.evaluationType === 'grade' || draft.evaluationType === 'both';
                  return (
                    <div key={k} className="flex items-center gap-2 flex-wrap">
                      <span className="w-28 shrink-0 text-xs text-gray-700 truncate">{row.subjectName}</span>
                      <select
                        value={draft.evaluationType}
                        onChange={(e) => setDrafts((d) => ({
                          ...d,
                          [k]: { ...draft, evaluationType: e.target.value as import('@schoolos/types').SubjectEvaluationType },
                        }))}
                        className="h-8 px-1.5 rounded-md border border-gray-200 text-xs text-gray-600"
                        title="How this subject is scored for this student"
                      >
                        {EVAL_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {showMarks && (
                        <>
                          <LabeledScoreInput label="UT1" value={draft.unitTest1Score} max={row.unitTestMaxMarks}
                            onChange={(v) => setDrafts((d) => ({ ...d, [k]: { ...draft, unitTest1Score: v } }))} />
                          <LabeledScoreInput label="UT2" value={draft.unitTest2Score} max={row.unitTestMaxMarks}
                            onChange={(v) => setDrafts((d) => ({ ...d, [k]: { ...draft, unitTest2Score: v } }))} />
                          <LabeledScoreInput label="Main" value={draft.mainExamScore} max={row.mainExamMaxMarks}
                            onChange={(v) => setDrafts((d) => ({ ...d, [k]: { ...draft, mainExamScore: v } }))} />
                        </>
                      )}
                      {showGrade && (
                        <input
                          value={draft.grade}
                          onChange={(e) => setDrafts((d) => ({ ...d, [k]: { ...draft, grade: e.target.value } }))}
                          placeholder="Grade"
                          className="h-8 w-14 px-2 rounded-md border border-gray-200 text-xs text-center"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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

function LabeledScoreInput({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-gray-400 w-8">{label}</span>
      <input
        type="number" min={0} max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-14 px-2 rounded-md border border-gray-200 text-xs text-right"
      />
      <span className="text-[9px] text-gray-400">/{max}</span>
    </div>
  );
}
