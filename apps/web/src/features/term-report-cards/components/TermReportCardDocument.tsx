import { CircularAttendance } from '@/features/report-cards/components/CircularAttendance';
import type { TermReportCard, ReportCardTemplate, SchoolSettings, TermReportCardTermBlock } from '@schoolos/types';

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

const INK = '#14161A';
const NAVY = '#1C2B4A';
const MUTED = '#6B7280';
const FAINT = '#9CA3AF';
const HAIRLINE = '#E5E6EA';
const TILE_BG = '#F7F8FA';

const PROMOTION_LABEL: Record<TermReportCard['summary']['promotionStatus'], string> = {
  promoted: 'Promoted to Next Class',
  not_promoted: 'Detained',
  pending: 'Result Awaited',
};

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] mb-2.5" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.1em]" style={{ color: FAINT }}>{label}</p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: INK }}>{value || '—'}</p>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg px-3.5 py-3 flex flex-col gap-0.5" style={{ backgroundColor: TILE_BG, border: `1px solid ${HAIRLINE}` }}>
      <span className="text-[8.5px] uppercase tracking-[0.1em]" style={{ color: FAINT }}>{label}</span>
      <span className="text-[15px] font-bold tracking-tight" style={{ color: accent ? NAVY : INK }}>{value}</span>
    </div>
  );
}

function TermTable({ title, unitTestLabel, mainLabel, block }: {
  title: string; unitTestLabel: string; mainLabel: string; block: TermReportCardTermBlock;
}) {
  return (
    <div className="mb-4">
      <SectionLabel>{title}</SectionLabel>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${NAVY}` }}>
            <th className="text-left py-1.5 text-[8.5px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>Subject</th>
            <th className="text-right py-1.5 text-[8.5px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>{unitTestLabel}</th>
            <th className="text-right py-1.5 text-[8.5px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>{mainLabel}</th>
            <th className="text-right py-1.5 text-[8.5px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {block.subjectRows.map((s) => {
            const showMarks = s.evaluationType === 'marks' || s.evaluationType === 'both';
            return (
              <tr key={s.subjectId} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td className="py-1.5 font-medium">{s.subjectName}</td>
                <td className="py-1.5 text-right" style={{ color: MUTED }}>
                  {showMarks ? `${s.bestUnitTestScore ?? '—'}/${s.unitTestMaxMarks}` : '—'}
                </td>
                <td className="py-1.5 text-right" style={{ color: MUTED }}>
                  {showMarks ? `${s.mainExamScore ?? '—'}/${s.mainExamMaxMarks}` : '—'}
                </td>
                <td className="py-1.5 text-right font-semibold" style={{ color: NAVY }}>
                  {showMarks ? (s.termTotal != null ? `${s.termTotal}/${s.termMaxMarks}` : '—') : (s.grade ?? '—')}
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="pt-2 font-bold" style={{ color: INK }}>Term Total</td>
            <td />
            <td />
            <td className="pt-2 text-right font-bold" style={{ color: NAVY }}>
              {block.termTotalObtained} / {block.termTotalMax} ({block.termPercentage}%)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

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
  const logoUrl = schoolSettings?.logoUrl;

  const skillBySection = new Map<string, typeof reportCard.skills>();
  for (const s of reportCard.skills) {
    const list = skillBySection.get(s.sectionId) ?? [];
    list.push(s);
    skillBySection.set(s.sectionId, list);
  }

  return (
    <div
      className="bg-white mx-auto text-[11px] leading-relaxed"
      style={{ width: '210mm', minHeight: '297mm', padding: '14mm 16mm', color: INK, fontFamily: 'Inter, sans-serif' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pb-4" style={{ borderBottom: `1.5px solid ${NAVY}` }}>
        <div className="flex items-start gap-3.5">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="w-14 h-14 object-contain shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: NAVY }}>
              <span className="text-white font-bold text-[16px]">{initials(schoolName)}</span>
            </div>
          )}
          <div>
            <h1 className="text-[19px] font-bold tracking-tight leading-tight" style={{ color: NAVY }}>{schoolName}</h1>
            {branding?.motto && <p className="text-[9.5px] italic mt-0.5" style={{ color: MUTED }}>{branding.motto}</p>}
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>
              {[branding?.address, branding?.phone, branding?.website].filter(Boolean).join('  ·  ')}
            </p>
          </div>
        </div>

        {qrDataUri && (
          <div className="flex flex-col items-center shrink-0">
            <img src={qrDataUri} alt="Verification QR" className="w-16 h-16" />
            <span className="text-[6.5px] mt-1 tracking-wide" style={{ color: FAINT }}>SCAN TO VERIFY</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 mb-5">
        <div>
          <p className="text-[13px] font-bold tracking-tight" style={{ color: INK }}>Annual Report Card</p>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Academic Year {reportCard.academicYear}</p>
        </div>
        <p className="text-[9px]" style={{ color: FAINT }}>Generated {fmtDate(reportCard.generatedAt)}</p>
      </div>

      {/* ── Student info ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 rounded-xl p-4 mb-5" style={{ backgroundColor: TILE_BG, border: `1px solid ${HAIRLINE}` }}>
        <div className="w-16 h-20 rounded-md overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: '#fff', border: `1px solid ${HAIRLINE}` }}>
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[16px] font-bold" style={{ color: NAVY }}>{initials(student.fullName)}</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-x-4 gap-y-2.5 flex-1">
          <div className="col-span-2">
            <p className="text-[8px] uppercase tracking-[0.1em]" style={{ color: FAINT }}>Student Name</p>
            <p className="text-[13px] font-bold mt-0.5" style={{ color: INK }}>{student.fullName}</p>
          </div>
          <InfoField label="Class — Section" value={`${student.class} – ${student.section}`} />
          <InfoField label="Admission No." value={student.admissionNumber} />
          <InfoField label="Roll No." value={student.rollNumber ?? '—'} />
          <InfoField label="Father's Name" value={student.fatherName ?? '—'} />
          <InfoField label="Mother's Name" value={student.motherName ?? '—'} />
          <InfoField label="Date of Birth" value={fmtDate(student.dateOfBirth)} />
        </div>
      </div>

      {/* ── Two term academic tables ──────────────────────────────────── */}
      <TermTable title="First Term" unitTestLabel="Unit Test" mainLabel="Half Yearly" block={reportCard.firstTerm} />
      <TermTable title="Final Term" unitTestLabel="Unit Test" mainLabel="Annual" block={reportCard.finalTerm} />

      {/* ── Grand total ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        <StatTile label="Grand Total" value={`${reportCard.grandTotalObtained} / ${reportCard.grandTotalMax}`} accent />
        <StatTile label="Average" value={`${reportCard.grandAveragePercent}%`} accent />
        <StatTile label="Class Rank" value={reportCard.summary.rank ? `${reportCard.summary.rank} of ${reportCard.summary.classSize}` : '—'} />
        <StatTile label="Result" value={PROMOTION_LABEL[reportCard.summary.promotionStatus]} />
      </div>

      {/* ── Skill sections ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-5">
        {template.skillSections.map((section) => (
          <div key={section._id}>
            <SectionLabel>{section.name}</SectionLabel>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                  <th className="text-left py-1 text-[8px] uppercase tracking-wide font-semibold" style={{ color: MUTED }} />
                  <th className="text-right py-1 text-[8px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>I Term</th>
                  <th className="text-right py-1 text-[8px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>II Term</th>
                </tr>
              </thead>
              <tbody>
                {(skillBySection.get(section._id ?? '') ?? []).map((row) => (
                  <tr key={row.rowId} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                    <td className="py-1 text-[10px]" style={{ color: MUTED }}>{row.rowLabel}</td>
                    <td className="py-1 text-right font-bold" style={{ color: NAVY }}>{row.firstTermGrade ?? '—'}</td>
                    <td className="py-1 text-right font-bold" style={{ color: NAVY }}>{row.finalTermGrade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ── Attendance ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-5">
        <div>
          <SectionLabel>Attendance — First Term</SectionLabel>
          <div className="flex items-center gap-5">
            <CircularAttendance percent={reportCard.firstTerm.attendance.percent} size={70} strokeWidth={6} />
            <div className="text-[10px]" style={{ color: MUTED }}>
              <p>Present: <b style={{ color: INK }}>{reportCard.firstTerm.attendance.present}</b> / {reportCard.firstTerm.attendance.workingDays}</p>
            </div>
          </div>
        </div>
        <div>
          <SectionLabel>Attendance — Final Term</SectionLabel>
          <div className="flex items-center gap-5">
            <CircularAttendance percent={reportCard.finalTerm.attendance.percent} size={70} strokeWidth={6} />
            <div className="text-[10px]" style={{ color: MUTED }}>
              <p>Present: <b style={{ color: INK }}>{reportCard.finalTerm.attendance.present}</b> / {reportCard.finalTerm.attendance.workingDays}</p>
            </div>
          </div>
        </div>
      </div>

      {(reportCard.teacherRemark || reportCard.principalRemark || reportCard.parentFeedback) && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {reportCard.teacherRemark && (
            <div>
              <SectionLabel>Class Teacher's Remark</SectionLabel>
              <p className="text-[10.5px] italic" style={{ color: INK }}>&ldquo;{reportCard.teacherRemark}&rdquo;</p>
            </div>
          )}
          {reportCard.principalRemark && (
            <div>
              <SectionLabel>Principal's Remark</SectionLabel>
              <p className="text-[10.5px] italic" style={{ color: INK }}>&ldquo;{reportCard.principalRemark}&rdquo;</p>
            </div>
          )}
          {reportCard.parentFeedback && (
            <div>
              <SectionLabel>Parent Feedback</SectionLabel>
              <p className="text-[10.5px] italic" style={{ color: INK }}>&ldquo;{reportCard.parentFeedback}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {!hideWarnings && reportCard.warnings.length > 0 && (
        <div className="mb-5 rounded-lg p-3" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FDBA74' }}>
          <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#9A3412' }}>For teacher review only — not printed</p>
          <ul className="text-[10px] list-disc pl-4" style={{ color: '#9A3412' }}>
            {reportCard.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* ── Grading key ──────────────────────────────────────────────── */}
      {template.gradingKey.length > 0 && (
        <div className="mb-5">
          <SectionLabel>Grading Key</SectionLabel>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {template.gradingKey.map((g) => (
              <span key={g.label} className="text-[9.5px]" style={{ color: MUTED }}>
                <b style={{ color: NAVY }}>{g.label}</b> – {g.description}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Signatures ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6 mt-8 pt-5" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <div className="text-center">
          <div className="h-8 flex items-end justify-center">
            <div className="w-full" style={{ borderBottom: `1px solid ${FAINT}` }} />
          </div>
          <p className="text-[9px] mt-1.5" style={{ color: MUTED }}>Class Teacher</p>
        </div>
        <div className="text-center">
          {branding?.principalSignatureUrl ? (
            <img src={branding.principalSignatureUrl} alt="Principal signature" className="h-8 mx-auto object-contain" />
          ) : (
            <div className="h-8 flex items-end justify-center"><div className="w-full" style={{ borderBottom: `1px solid ${FAINT}` }} /></div>
          )}
          <p className="text-[9px] mt-1.5" style={{ color: MUTED }}>{branding?.principalName || 'Principal'}</p>
        </div>
        <div className="text-center">
          {branding?.schoolSealUrl ? (
            <img src={branding.schoolSealUrl} alt="School seal" className="h-12 mx-auto object-contain opacity-80" />
          ) : (
            <div className="h-8 flex items-end justify-center"><div className="w-full" style={{ borderBottom: `1px solid ${FAINT}` }} /></div>
          )}
          <p className="text-[9px] mt-1.5" style={{ color: MUTED }}>School Seal · {fmtDate(reportCard.generatedAt)}</p>
        </div>
      </div>

      <p className="text-center text-[8px] mt-6" style={{ color: FAINT }}>
        Verified by SchoolOS AI · {branding?.email || ''}
      </p>
    </div>
  );
}
