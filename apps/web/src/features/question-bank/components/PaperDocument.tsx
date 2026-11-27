import type { GeneratedPaper, Question, SchoolSettings } from '@schoolos/types';
import { ExamPaperSheet, formatDuration, sessionLabel, type ExamPaperSection } from '@/components/exam-paper/ExamPaperSheet';
import { CroppedFigureImage } from './CroppedFigureImage';

const MUTED = '#4B5563';
const HAIRLINE = '#E5E6EA';

/** Renders a question's figure when one was resolved, or a plain placeholder note when the
 * question needs a picture but none exists yet (imageRequirement) — never fabricates an image. */
function QuestionFigure({ q, paper }: { q: Question; paper: GeneratedPaper }) {
  if (q.imageRef) {
    const resolved = paper.resolvedImages?.[`${q.imageRef.sourceId}:${q.imageRef.figureId}`];
    if (!resolved) return null; // source/image no longer available — degrade to a text-only question rather than erroring
    return (
      <div className="mt-2" style={{ maxWidth: '90mm' }}>
        <CroppedFigureImage dataUri={resolved.pageImageDataUri} boundingBox={resolved.boundingBox} blackAndWhite={paper.config.blackAndWhite}
          style={{ borderRadius: 4, border: `1px solid ${HAIRLINE}` }} />
      </div>
    );
  }
  if (q.imageRequirement) {
    return (
      <p className="mt-1.5 text-[10px] italic" style={{ color: MUTED }}>
        [Image needed: {q.imageRequirement.imagePrompt || 'a suitable picture for this question'}]
      </p>
    );
  }
  return null;
}

function marksText(marks: number): string {
  return `${marks} mark${marks !== 1 ? 's' : ''}`;
}

export function PaperDocument({ paper, schoolSettings }: { paper: GeneratedPaper; schoolSettings?: SchoolSettings }) {
  const filled = paper.sections.filter((s) => s.questions.length > 0);

  const sections: ExamPaperSection[] = filled.map((section, i) => ({
    title: section.name || `Section ${String.fromCharCode(65 + i)}`,
    marksNote: `${section.questions.length} × ${section.marks} = ${section.questions.length * section.marks}`,
    questions: section.questions.map((q) => ({
      key: q._id,
      text: q.questionText,
      type: q.questionType,
      options: q.options,
      marks: q.marks,
      figure: <QuestionFigure q={q} paper={paper} />,
    })),
  }));

  let first = 1;
  const sectionLines = filled.map((section, i) => {
    const last = first + section.questions.length - 1;
    const range = first === last ? `Q. ${first}` : `Q. ${first}–${last}`;
    first = last + 1;
    return `Section ${String.fromCharCode(65 + i)}: ${range} (${marksText(section.marks)}${section.questions.length > 1 ? ' each' : ''})`;
  });
  const total = first - 1;

  return (
    <>
      <ExamPaperSheet
        schoolSettings={schoolSettings}
        heading={paper.config.examType}
        subheading={`Session ${sessionLabel(paper.createdAt)}`}
        className={paper.config.class}
        subject={paper.config.subject}
        duration={paper.config.durationMinutes ? formatDuration(paper.config.durationMinutes) : undefined}
        maxMarks={paper.totalMarksAssembled}
        studentFields={['Name', 'Roll No.', 'Section']}
        instructions={[
          `All questions are compulsory. The paper has ${total} questions in ${filled.length} section${filled.length !== 1 ? 's' : ''}.`,
          `${sectionLines.join('; ')}.`,
          'Marks for each question are shown against it. Show the necessary working wherever required.',
        ]}
        sections={sections}
      />
      {paper.config.includeAnswerKey && <AnswerKey paper={paper} />}
    </>
  );
}

function AnswerKey({ paper }: { paper: GeneratedPaper }) {
  let qNumber = 0;
  return (
    <div style={{ breakBefore: 'page', width: '210mm', padding: '14mm', background: '#fff', color: '#000', fontFamily: '"Times New Roman", Georgia, serif' }} className="exam-sheet mx-auto">
      <div className="text-center pb-3" style={{ borderBottom: '2px solid #000' }}>
        <p className="text-base font-bold tracking-wide uppercase">Answer Key</p>
        <p className="text-xs mt-1">{paper.config.examType} — Class {paper.config.class} · {paper.config.subject}</p>
      </div>
      <div className="mt-4 space-y-2">
        {paper.sections.flatMap((section) => section.questions).map((q) => {
          qNumber += 1;
          return (
            <p key={q._id} className="text-sm leading-relaxed whitespace-pre-line">
              <strong>{qNumber}.</strong>{' '}
              {q.correctAnswer?.trim() ? q.correctAnswer : <span style={{ color: MUTED }}>(no answer recorded)</span>}
            </p>
          );
        })}
      </div>
    </div>
  );
}
