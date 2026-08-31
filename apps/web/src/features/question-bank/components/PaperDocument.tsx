import type { GeneratedPaper, Question, SchoolSettings } from '@schoolos/types';
import { stripOptionLabel } from '../lib/optionText';
import { CroppedFigureImage } from './CroppedFigureImage';

const INK = '#14161A';
const NAVY = '#1C2B4A';
const MUTED = '#6B7280';
const HAIRLINE = '#E5E6EA';

function questionTypeLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Renders a question's figure when one was resolved, or a plain placeholder note when the
 * question needs a picture but none exists yet (imageRequirement) — never fabricates an image. */
function QuestionFigure({ q, paper }: { q: Question; paper: GeneratedPaper }) {
  if (q.imageRef) {
    const resolved = paper.resolvedImages?.[`${q.imageRef.sourceId}:${q.imageRef.figureId}`];
    if (!resolved) return null; // source/image no longer available — degrade to a text-only question rather than erroring
    return (
      <div className="mt-2 pl-5" style={{ maxWidth: '90mm' }}>
        <CroppedFigureImage dataUri={resolved.pageImageDataUri} boundingBox={resolved.boundingBox} blackAndWhite={paper.config.blackAndWhite}
          style={{ borderRadius: 4, border: `1px solid ${HAIRLINE}` }} />
      </div>
    );
  }
  if (q.imageRequirement) {
    return (
      <p className="mt-1.5 pl-5 text-[10px] italic" style={{ color: MUTED }}>
        [Image needed: {q.imageRequirement.imagePrompt || 'a suitable picture for this question'}]
      </p>
    );
  }
  return null;
}

export function PaperDocument({ paper, schoolSettings }: { paper: GeneratedPaper; schoolSettings?: SchoolSettings }) {
  let qNumber = 0;

  return (
    <div className="bg-white mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '16mm', color: INK, fontFamily: 'Georgia, serif' }}>
      <div className="text-center pb-4" style={{ borderBottom: `2px solid ${NAVY}` }}>
        <p className="text-lg font-bold tracking-wide" style={{ color: NAVY }}>{schoolSettings?.schoolName ?? 'School Name'}</p>
        <p className="text-sm mt-1" style={{ color: MUTED }}>{paper.config.examType} — Class {paper.config.class} · {paper.config.subject}</p>
        <div className="flex justify-center gap-8 mt-2 text-xs" style={{ color: MUTED }}>
          <span>Total Marks: <strong style={{ color: INK }}>{paper.totalMarksAssembled}</strong></span>
          {paper.config.durationMinutes && <span>Duration: <strong style={{ color: INK }}>{paper.config.durationMinutes} minutes</strong></span>}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {paper.sections.map((section, i) => (
          <div key={`${section.name ?? section.marks}-${i}`}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: NAVY }}>
              {section.name ? section.name : `Section — ${section.marks} Mark${section.marks !== 1 ? 's' : ''} Each`}
              {section.name && <span className="normal-case font-normal ml-1.5" style={{ color: MUTED }}>({section.marks} mark{section.marks !== 1 ? 's' : ''} each)</span>}
            </p>
            <div className="space-y-3">
              {section.questions.map((q) => {
                qNumber += 1;
                return (
                  <div key={q._id} className="text-sm leading-relaxed" style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '8px' }}>
                    <p><strong>Q{qNumber}.</strong> {q.questionText} <span className="text-xs" style={{ color: MUTED }}>[{q.marks}]</span></p>
                    <QuestionFigure q={q} paper={paper} />
                    {q.questionType === 'mcq' && q.options && (
                      <div className="grid grid-cols-2 gap-x-4 mt-1 pl-5 text-xs">
                        {q.options.map((opt, i) => <span key={i}>({String.fromCharCode(97 + i)}) {stripOptionLabel(opt)}</span>)}
                      </div>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                      {questionTypeLabel(q.questionType)} · {q.chapterName}{q.topic ? ` — ${q.topic}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {paper.config.includeAnswerKey && <AnswerKey paper={paper} />}
    </div>
  );
}

function AnswerKey({ paper }: { paper: GeneratedPaper }) {
  let qNumber = 0;
  return (
    <div style={{ breakBefore: 'page' }} className="mt-10 pt-8">
      <div className="text-center pb-4" style={{ borderBottom: `2px solid ${NAVY}` }}>
        <p className="text-base font-bold tracking-wide" style={{ color: NAVY }}>Answer Key</p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>{paper.config.examType} — Class {paper.config.class} · {paper.config.subject}</p>
      </div>
      <div className="mt-4 space-y-2">
        {paper.sections.flatMap((section) => section.questions).map((q) => {
          qNumber += 1;
          return (
            <p key={q._id} className="text-sm leading-relaxed">
              <strong>Q{qNumber}.</strong>{' '}
              {q.correctAnswer?.trim() ? q.correctAnswer : <span style={{ color: MUTED }}>(no answer recorded)</span>}
            </p>
          );
        })}
      </div>
    </div>
  );
}
