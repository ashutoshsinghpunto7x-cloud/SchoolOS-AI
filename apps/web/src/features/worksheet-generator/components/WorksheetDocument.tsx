import type { SchoolSettings, Worksheet, WorksheetQuestion } from '@schoolos/types';
import { ExamPaperSheet, formatDuration, sessionLabel, type ExamPaperSection } from '@/components/exam-paper/ExamPaperSheet';
import { CroppedFigureImage } from '@/features/question-bank/components/CroppedFigureImage';

const SECTION_NAMES: Record<string, string> = {
  mcq: 'Multiple Choice Questions',
  fill_blank: 'Fill in the Blanks',
  true_false: 'True or False',
  very_short: 'Very Short Answer Questions',
  short: 'Short Answer Questions',
  long: 'Long Answer Questions',
  numerical: 'Numericals',
  word_problem: 'Word Problems',
  hots: 'Higher Order Thinking',
  case_study: 'Case Study',
};

function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function QuestionFigure({ q, worksheet }: { q: WorksheetQuestion; worksheet: Worksheet }) {
  const resolved = q.imageRef && worksheet.resolvedImages?.[`${q.imageRef.sourceId}:${q.imageRef.figureId}`];
  if (resolved) {
    return (
      <div className="mt-2" style={{ maxWidth: '90mm' }}>
        <CroppedFigureImage dataUri={resolved.pageImageDataUri} boundingBox={resolved.boundingBox}
          style={{ borderRadius: 4, border: '1px solid #E5E6EA' }} />
      </div>
    );
  }
  if (!q.imageRequirement) return null;
  return (
    <p className="mt-1.5 text-[10px] italic text-gray-500">
      [Image needed: {q.imageRequirement.imagePrompt || 'a suitable picture for this question'}]
    </p>
  );
}

export function WorksheetDocument({ worksheet, schoolSettings }: { worksheet: Worksheet; schoolSettings?: SchoolSettings }) {
  // One section per question type, in the order each type first appears.
  const byType = new Map<string, { q: WorksheetQuestion; index: number }[]>();
  worksheet.questions.forEach((q, index) => {
    byType.set(q.questionType, [...(byType.get(q.questionType) ?? []), { q, index }]);
  });

  const sections: ExamPaperSection[] = [...byType.entries()].map(([type, items], i) => {
    const sectionMarks = items.every(({ q }) => q.marks !== undefined) ? items.reduce((sum, { q }) => sum + (q.marks ?? 0), 0) : undefined;
    return {
      title: `Section ${String.fromCharCode(65 + i)} — ${SECTION_NAMES[type] ?? labelize(type)}`,
      marksNote: sectionMarks !== undefined ? `[${sectionMarks} Marks]` : undefined,
      questions: items.map(({ q, index }) => ({
        key: String(index),
        text: q.questionText,
        type: q.questionType,
        options: q.options,
        marks: q.marks,
        figure: <QuestionFigure q={q} worksheet={worksheet} />,
      })),
    };
  });

  const allMarked = worksheet.questions.every((q) => q.marks !== undefined);
  const minutes = worksheet.questions.reduce((sum, q) => sum + q.estimatedTimeMinutes, 0);

  return (
    <ExamPaperSheet
      schoolSettings={schoolSettings}
      heading={worksheet.title}
      subheading={`Session ${sessionLabel(worksheet.createdAt)} · Chapter: ${worksheet.chapterNames.join(', ')}`}
      className={worksheet.class}
      subject={worksheet.subject}
      duration={minutes > 0 ? formatDuration(Math.ceil(minutes / 5) * 5) : undefined}
      maxMarks={allMarked ? worksheet.questions.reduce((sum, q) => sum + (q.marks ?? 0), 0) : undefined}
      studentFields={['Name', 'Roll No.', 'Section', 'Date']}
      instructions={['Attempt all questions.', 'Read each question carefully and write your answers neatly, showing the working wherever required.']}
      sections={sections}
    />
  );
}
