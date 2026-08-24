import type { GeneratedPaper, SchoolSettings } from '@schoolos/types';
import { stripOptionLabel } from '../lib/optionText';

const INK = '#14161A';
const NAVY = '#1C2B4A';
const MUTED = '#6B7280';
const HAIRLINE = '#E5E6EA';

function questionTypeLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
        {paper.sections.map((section) => (
          <div key={section.marks}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: NAVY }}>
              Section — {section.marks} Mark{section.marks !== 1 ? 's' : ''} Each
            </p>
            <div className="space-y-3">
              {section.questions.map((q) => {
                qNumber += 1;
                return (
                  <div key={q._id} className="text-sm leading-relaxed" style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '8px' }}>
                    <p><strong>Q{qNumber}.</strong> {q.questionText} <span className="text-xs" style={{ color: MUTED }}>[{q.marks}]</span></p>
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
    </div>
  );
}
