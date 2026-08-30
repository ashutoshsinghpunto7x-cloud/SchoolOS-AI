import type { CSSProperties } from 'react';
import type { TermReportCard, ReportCardTemplate, SchoolSettings, TermReportCardTermBlock, TermReportCardSkillEntry } from '@schoolos/types';

/** Only the header fields this document actually renders — lets the parent
 *  workspace (which never fetches the full Student record) pass its own
 *  narrower view without widening what a parent can read. A full `Student`
 *  satisfies this structurally, so existing callers are unaffected. */
export interface ReportCardStudentHeader {
  fullName: string;
  admissionNumber: string;
  rollNumber?: string;
  class: string;
  section: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  photoUrl?: string;
}

// This document deliberately mirrors the school's existing pre-printed paper
// report card layout (ruled table, serif type, black-on-white) rather than a
// modern card design — the whole point is that a class teacher can open it
// and hit print with no extra formatting work.
const RULE = '1px solid #000';
const RULE_THICK = '1.5px solid #000';

const PROMOTION_LABEL: Record<TermReportCard['summary']['promotionStatus'], string> = {
  promoted: 'Promoted to Class',
  not_promoted: 'Detained in Class',
  pending: 'Result Awaited',
};

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** First subject with numeric marks, used only to read the common unit-test /
 *  main-exam max marks for the column headers (e.g. "20", "80") — every
 *  marks-evaluated subject on a template shares the same two max-marks values. */
function headerMaxMarks(block: TermReportCardTermBlock): { unitTest: number; main: number } {
  const row = block.subjectRows.find((r) => r.evaluationType !== 'grade');
  return { unitTest: row?.unitTestMaxMarks ?? 0, main: row?.mainExamMaxMarks ?? 0 };
}

const th: CSSProperties = {
  border: RULE, padding: '1.5px 3px', fontWeight: 700, fontSize: '6.5px', textAlign: 'center',
  verticalAlign: 'middle', lineHeight: 1.1, textTransform: 'uppercase',
};
const tdSubject: CSSProperties = { border: RULE, padding: '1px 4px', fontSize: '7.3px', whiteSpace: 'nowrap' };
const tdNum: CSSProperties = { border: RULE, padding: '1px 3px', fontSize: '7.3px', textAlign: 'center' };

interface TermReportCardDocumentProps {
  reportCard: TermReportCard;
  template: ReportCardTemplate;
  student: ReportCardStudentHeader;
  schoolSettings?: SchoolSettings;
  qrDataUri?: string;
  hideWarnings?: boolean;
}

export function TermReportCardDocument({ reportCard, template, student, schoolSettings, qrDataUri, hideWarnings = true }: TermReportCardDocumentProps) {
  const branding = schoolSettings?.reportCardBranding;
  const schoolName = schoolSettings?.schoolName || 'School Name';

  const skillBySection = new Map<string, TermReportCardSkillEntry[]>();
  for (const s of reportCard.skills) {
    const list = skillBySection.get(s.sectionId) ?? [];
    list.push(s);
    skillBySection.set(s.sectionId, list);
  }

  const ft = headerMaxMarks(reportCard.firstTerm);
  const xt = headerMaxMarks(reportCard.finalTerm);
  const grandMax = ft.unitTest + ft.main + xt.unitTest + xt.main;

  function cell(v: number | undefined): string {
    return v != null ? `${v}` : '—';
  }

  function renderSubjectRow(subjectName: string, first: TermReportCardTermBlock['subjectRows'][number] | undefined, final: TermReportCardTermBlock['subjectRows'][number] | undefined, key: string) {
    const graded = (first?.evaluationType ?? final?.evaluationType) === 'grade';
    return (
      <tr key={key}>
        <td style={{ ...tdSubject, textTransform: 'uppercase' }}>{subjectName}</td>
        {graded ? (
          <>
            <td style={tdNum}>{first?.grade ?? '—'}</td>
            <td style={tdNum}>{first?.grade ?? '—'}</td>
            <td style={tdNum}>{first?.grade ?? '—'}</td>
            <td style={tdNum}>{final?.grade ?? '—'}</td>
            <td style={tdNum}>{final?.grade ?? '—'}</td>
            <td style={tdNum}>{final?.grade ?? '—'}</td>
          </>
        ) : (
          <>
            <td style={tdNum}>{cell(first?.bestUnitTestScore)}</td>
            <td style={tdNum}>{cell(first?.mainExamScore)}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{cell(first?.termTotal)}</td>
            <td style={tdNum}>{cell(final?.bestUnitTestScore)}</td>
            <td style={tdNum}>{cell(final?.mainExamScore)}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{cell(final?.termTotal)}</td>
          </>
        )}
        <td style={{ ...tdNum, fontWeight: 700 }}>
          {!graded && first?.termTotal != null && final?.termTotal != null ? `${first.termTotal + final.termTotal}` : '—'}
        </td>
        <td style={{ ...tdNum, fontWeight: 700 }}>
          {!graded && first?.termTotal != null && final?.termTotal != null && (first.termMaxMarks + final.termMaxMarks) > 0
            ? `${Math.round(((first.termTotal + final.termTotal) / (first.termMaxMarks + final.termMaxMarks)) * 1000) / 10}`
            : '—'}
        </td>
      </tr>
    );
  }

  // Subject order/identity comes from the template (the principal's approved
  // layout), not from whichever term happens to have data — a student with
  // only First Term marks entered still sees every subject, in order.
  const finalBySubject = new Map(reportCard.finalTerm.subjectRows.map((r) => [r.subjectId, r]));
  const firstBySubject = new Map(reportCard.firstTerm.subjectRows.map((r) => [r.subjectId, r]));

  return (
    <div
      className="bg-white mx-auto"
      style={{ width: '297mm', minHeight: '210mm', padding: '8mm 12mm', color: '#000', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '10px' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      {/* Class/section, roll no. and the verify QR sit level with the school
       *  name — mirrors the paper card's top-right corner block — while the
       *  student/father name row underneath runs full width. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: '110px' }} />
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {schoolSettings?.logoUrl && <img src={schoolSettings.logoUrl} alt={schoolName} style={{ width: '34px', height: '34px', objectFit: 'contain' }} />}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.02em', margin: 0 }}>{schoolName.toUpperCase()}</h1>
            {branding?.address && <p style={{ fontSize: '9px', margin: '1px 0 0' }}>({branding.address})</p>}
          </div>
        </div>
        <div style={{ width: '110px', textAlign: 'right' }}>
          <p style={{ margin: '1px 0', fontWeight: 700, fontSize: '9px' }}>CLASS/SECTION : {student.class} - {student.section}</p>
          <p style={{ margin: '1px 0', fontWeight: 700, fontSize: '9px' }}>ROLL No : {student.rollNumber ?? '—'}</p>
          {qrDataUri && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '3px' }}>
              <img src={qrDataUri} alt="Verification QR" style={{ width: '30px', height: '30px' }} />
              <span style={{ fontSize: '5.5px', letterSpacing: '0.08em' }}>SCAN TO VERIFY</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ borderBottom: RULE_THICK, paddingBottom: '4px', marginTop: '5px' }}>
        <p style={{ margin: '1px 0' }}><b>STUDENT&apos;S NAME&nbsp;&nbsp;</b>{student.fullName.toUpperCase()}</p>
        <p style={{ margin: '1px 0' }}><b>FATHER&apos;S NAME&nbsp;&nbsp;</b>{(student.fatherName ?? '—').toUpperCase()}</p>
      </div>

      {/* ── Marks grid + right panel ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '68% 32%', border: RULE_THICK, marginTop: '6px' }}>
        {/* Marks table */}
        <div style={{ borderRight: RULE_THICK }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '20%' }} rowSpan={2}>Subjects</th>
                <th style={th} colSpan={3}>First Term</th>
                <th style={th} colSpan={3}>Final Term</th>
                <th style={th} rowSpan={2}>Grand<br />Total<br />{grandMax}</th>
                <th style={th} rowSpan={2}>Average<br />100</th>
              </tr>
              <tr>
                <th style={th}>Unit Test<br />{ft.unitTest}</th>
                <th style={th}>Half Yearly<br />{ft.main}</th>
                <th style={th}>Total<br />{ft.unitTest + ft.main}</th>
                <th style={th}>Unit Test<br />{xt.unitTest}</th>
                <th style={th}>Annual<br />{xt.main}</th>
                <th style={th}>Total<br />{xt.unitTest + xt.main}</th>
              </tr>
            </thead>
            <tbody>
              {template.subjects.map((subj) =>
                renderSubjectRow(subj.name, firstBySubject.get(subj._id ?? ''), finalBySubject.get(subj._id ?? ''), subj._id ?? subj.name))}

              <tr>
                <td style={{ ...tdSubject, fontWeight: 700 }}>Total</td>
                <td style={tdNum} colSpan={2} />
                <td style={{ ...tdNum, fontWeight: 700 }}>{reportCard.firstTerm.termTotalObtained} / {reportCard.firstTerm.termTotalMax}</td>
                <td style={tdNum} colSpan={2} />
                <td style={{ ...tdNum, fontWeight: 700 }}>{reportCard.finalTerm.termTotalObtained} / {reportCard.finalTerm.termTotalMax}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{reportCard.grandTotalObtained} / {reportCard.grandTotalMax}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{reportCard.grandAveragePercent}%</td>
              </tr>
              <tr>
                <td style={{ ...tdSubject, fontWeight: 700 }}>Percentage</td>
                <td style={tdNum} colSpan={2} />
                <td style={tdNum}>{reportCard.firstTerm.termTotalMax > 0 ? `${reportCard.firstTerm.termPercentage}%` : '—'}</td>
                <td style={tdNum} colSpan={2} />
                <td style={tdNum}>{reportCard.finalTerm.termTotalMax > 0 ? `${reportCard.finalTerm.termPercentage}%` : '—'}</td>
                <td style={tdNum} colSpan={2} />
              </tr>
              <tr>
                <td style={{ ...tdSubject, fontWeight: 700 }}>Position</td>
                <td style={tdNum} colSpan={2} />
                <td style={tdNum}>{reportCard.firstTerm.rank ? `${reportCard.firstTerm.rank}/${reportCard.firstTerm.classSize}` : '—'}</td>
                <td style={tdNum} colSpan={2} />
                <td style={tdNum}>{reportCard.finalTerm.rank ? `${reportCard.finalTerm.rank}/${reportCard.finalTerm.classSize}` : '—'}</td>
                <td style={tdNum} colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right panel: skills + attendance + signatures */}
        <div>
          {template.skillSections.map((section) => (
            <table key={section._id} style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={{ ...th, textAlign: 'left', textTransform: 'uppercase' }} colSpan={3}>{section.name}</th></tr>
                <tr>
                  <th style={th} />
                  <th style={th}>I Term</th>
                  <th style={th}>II Term</th>
                </tr>
              </thead>
              <tbody>
                {(skillBySection.get(section._id ?? '') ?? []).map((row) => (
                  <tr key={row.rowId}>
                    <td style={{ ...tdSubject, fontSize: '7.3px' }}>{row.rowLabel}</td>
                    <td style={tdNum}>{row.firstTermGrade ?? '—'}</td>
                    <td style={tdNum}>{row.finalTermGrade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{ ...th, textAlign: 'left' }} colSpan={3}>Attendance</th></tr>
              <tr>
                <th style={th} />
                <th style={th}>I Term</th>
                <th style={th}>II Term</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdSubject, fontSize: '7.3px' }}>Present / Working Days</td>
                <td style={tdNum}>{reportCard.firstTerm.attendance.present}/{reportCard.firstTerm.attendance.workingDays}</td>
                <td style={tdNum}>{reportCard.finalTerm.attendance.present}/{reportCard.finalTerm.attendance.workingDays}</td>
              </tr>
            </tbody>
          </table>

          {/* Signed once per term (like every other right-panel section), not
           *  once for the whole card — matches the paper card's ruled I
           *  Term/II Term signature columns rather than a single line. */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th} />
                <th style={th}>I Term</th>
                <th style={th}>II Term</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdSubject, fontSize: '7.3px' }}>Principal&apos;s Signature</td>
                <td style={{ ...tdNum, height: '14px' }} />
                <td style={{ ...tdNum, height: '14px' }} />
              </tr>
              <tr>
                <td style={{ ...tdSubject, fontSize: '7.3px' }}>Class Teacher&apos;s Signature</td>
                <td style={{ ...tdNum, height: '14px' }} />
                <td style={{ ...tdNum, height: '14px' }} />
              </tr>
              <tr>
                <td style={{ ...tdSubject, fontSize: '7.3px' }}>Parent&apos;s Signature</td>
                <td style={{ ...tdNum, height: '14px' }} />
                <td style={{ ...tdNum, height: '14px' }} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Result + grading key ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700 }}>
          {PROMOTION_LABEL[reportCard.summary.promotionStatus]}
          {reportCard.summary.promotionStatus === 'promoted' && <span style={{ display: 'inline-block', minWidth: '70px', borderBottom: RULE, marginLeft: '4px' }}>&nbsp;</span>}
        </p>
        {template.gradingKey.length > 0 && (
          <div style={{ fontSize: '8px', textAlign: 'right' }}>
            <p style={{ fontWeight: 700, margin: 0 }}>Key</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', columnGap: '14px', rowGap: '1px', justifyContent: 'end' }}>
              {template.gradingKey.map((g) => <span key={g.label}>{g.label}-{g.description}</span>)}
            </div>
          </div>
        )}
      </div>

      {!hideWarnings && reportCard.warnings.length > 0 && (
        <div style={{ marginTop: '10px', padding: '6px', border: '1px dashed #999' }}>
          <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase' }}>For teacher review only — not printed</p>
          <ul style={{ fontSize: '8.5px', paddingLeft: '14px' }}>
            {reportCard.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '7px', marginTop: '10px', color: '#555' }}>
        Academic Year {reportCard.academicYear} · Generated {fmtDate(reportCard.generatedAt)} · Verified by SchoolOS AI
      </p>
    </div>
  );
}
