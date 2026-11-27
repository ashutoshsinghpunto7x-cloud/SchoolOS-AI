import type { ReactNode } from 'react';
import type { SchoolSettings } from '@schoolos/types';
import { stripOptionLabel } from '@/features/question-bank/lib/optionText';

/** The printed school exam-paper layout shared by question papers and worksheets: letterhead,
 * student details, general instructions, then lettered sections with marks in the right margin. */

const INK = '#000';
const RULE = `1px solid ${INK}`;

export interface ExamPaperQuestion {
  key: string;
  text: string;
  type: string;
  options?: string[];
  marks?: number;
  figure?: ReactNode;
}

export interface ExamPaperSection {
  title: string;
  /** Right-aligned note on the section heading, e.g. "10 × 1 = 10". */
  marksNote?: string;
  questions: ExamPaperQuestion[];
}

interface ExamPaperSheetProps {
  schoolSettings?: SchoolSettings;
  heading: string;
  subheading?: string;
  className: string;
  subject: string;
  duration?: string;
  /** Left undefined, the paper prints a blank for the teacher to fill in. */
  maxMarks?: number;
  studentFields: string[];
  instructions: string[];
  sections: ExamPaperSection[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function classLabel(cls: string): string {
  return /^\d+$/.test(cls) ? (ROMAN[Number(cls) - 1] ?? cls) : cls;
}

function subjectLabel(subject: string): string {
  return subject === 'Maths' ? 'Mathematics' : subject;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} Minutes`;
  const hourText = `${hours} Hour${hours > 1 ? 's' : ''}`;
  return rest ? `${hourText} ${rest} Minutes` : hourText;
}

/** Indian April–March session the given date falls in, e.g. "2026–27". */
export function sessionLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}–${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Short options sit four to a line, medium ones two, long ones one — as a printed paper sets them. */
function optionColumns(options: string[]): number {
  const longest = Math.max(...options.map((o) => o.length));
  if (longest <= 14) return 4;
  return longest <= 36 ? 2 : 1;
}

export function ExamPaperSheet({
  schoolSettings, heading, subheading, className, subject, duration, maxMarks, studentFields, instructions, sections,
}: ExamPaperSheetProps) {
  const address = schoolSettings?.reportCardBranding?.address;
  let qNumber = 0;

  return (
    <div className="exam-sheet mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '14mm', background: '#fff', color: INK, fontFamily: '"Times New Roman", Georgia, serif', fontSize: '11pt', lineHeight: 1.35 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
        <div style={{ width: '22mm', flexShrink: 0 }}>
          {schoolSettings?.logoUrl && <img src={schoolSettings.logoUrl} alt="" style={{ width: '22mm', height: '22mm', objectFit: 'contain' }} />}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: '20pt', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.2 }}>
            {schoolSettings?.schoolName ?? 'School Name'}
          </p>
          {address && <p style={{ fontSize: '9.5pt' }}>{address}</p>}
          <p style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', marginTop: '1.5mm' }}>{heading}</p>
          {subheading && <p style={{ fontSize: '10.5pt' }}>{subheading}</p>}
        </div>
        <div style={{ width: '22mm', flexShrink: 0 }} />
      </header>

      <div style={{ borderTop: `2px solid ${INK}`, borderBottom: RULE, marginTop: '3mm', padding: '1.5mm 0', fontWeight: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Class: {classLabel(className)}</span>
          <span>Subject: {subjectLabel(subject)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Time: {duration ?? '________'}</span>
          <span>Maximum Marks: {maxMarks ?? '______'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '5mm', marginTop: '3mm' }}>
        {studentFields.map((field, i) => (
          <div key={field} style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5mm', flex: i === 0 ? 2.4 : 1 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{field}:</span>
            <span style={{ flex: 1, borderBottom: `1px dotted ${INK}` }} />
          </div>
        ))}
      </div>

      {instructions.length > 0 && (
        <div style={{ marginTop: '2.5mm', paddingBottom: '1.5mm', borderBottom: RULE, breakInside: 'avoid' }}>
          <p style={{ fontWeight: 700, textDecoration: 'underline' }}>General Instructions:</p>
          <ol style={{ listStyle: 'decimal', paddingLeft: '7mm', fontSize: '10.5pt', fontStyle: 'italic' }}>
            {instructions.map((line) => <li key={line}>{line}</li>)}
          </ol>
        </div>
      )}

      {sections.map((section) => (
        <section key={section.title} style={{ marginTop: '3mm' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28mm 1fr 28mm', alignItems: 'baseline', fontWeight: 700, breakAfter: 'avoid', marginBottom: '1.5mm' }}>
            <span />
            <span style={{ textAlign: 'center', textTransform: 'uppercase' }}>{section.title}</span>
            <span style={{ textAlign: 'right' }}>{section.marksNote}</span>
          </div>
          {section.questions.map((q) => {
            qNumber += 1;
            const options = q.type === 'mcq' || q.type === 'assertion_reason' ? q.options?.map(stripOptionLabel) : undefined;
            return (
              <div key={q.key} style={{ display: 'grid', gridTemplateColumns: '9mm 1fr 10mm', marginBottom: '1.8mm', breakInside: 'avoid' }}>
                <span style={{ fontWeight: 700 }}>{qNumber}.</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ whiteSpace: 'pre-line' }}>
                    {q.text}
                    {q.type === 'true_false' && <span style={{ whiteSpace: 'nowrap' }}>{'  '}(True / False)</span>}
                  </p>
                  {q.figure}
                  {options && options.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${optionColumns(options)}, 1fr)`, columnGap: '4mm', marginTop: '0.5mm' }}>
                      {options.map((opt, i) => <span key={i}>({String.fromCharCode(97 + i)}) {opt}</span>)}
                    </div>
                  )}
                </div>
                <span style={{ textAlign: 'right', fontWeight: 700 }}>{q.marks !== undefined ? `[${q.marks}]` : ''}</span>
              </div>
            );
          })}
        </section>
      ))}

      <p style={{ textAlign: 'center', marginTop: '4mm', fontWeight: 700, breakBefore: 'avoid' }}>✽ ✽ ✽ &nbsp;All the Best&nbsp; ✽ ✽ ✽</p>
    </div>
  );
}
