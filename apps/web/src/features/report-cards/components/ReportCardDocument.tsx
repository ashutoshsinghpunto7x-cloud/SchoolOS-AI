import { CircularAttendance } from './CircularAttendance';
import type { ReportCard, Student, Exam, SchoolSettings } from '@schoolos/types';

// ── Design tokens — restrained, print-safe, no gradients/shadows ───────────────
const INK = '#14161A';
const NAVY = '#1C2B4A';
const MUTED = '#6B7280';
const FAINT = '#9CA3AF';
const HAIRLINE = '#E5E6EA';
const TILE_BG = '#F7F8FA';

const EXAM_TYPE_LABELS: Record<Exam['examType'], string> = {
  unit_test: 'Unit Test',
  monthly_test: 'Monthly Test',
  half_yearly: 'Half Yearly Examination',
  annual: 'Annual Examination',
  practical: 'Practical Examination',
  internal_assessment: 'Internal Assessment',
  other: 'Examination',
};

const PROMOTION_LABEL: Record<ReportCard['summary']['promotionStatus'], string> = {
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

// ── Small building blocks ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] mb-2.5" style={{ color: MUTED }}>
      {children}
    </p>
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.1em]" style={{ color: FAINT }}>{label}</p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: INK }}>{value || '—'}</p>
    </div>
  );
}

function SubjectBar({ name, percentage }: { name: string; percentage?: number }) {
  const pct = percentage ?? 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] w-24 shrink-0 truncate" style={{ color: MUTED }}>{name}</span>
      <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: HAIRLINE }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: NAVY }} />
      </div>
      <span className="text-[10px] font-semibold w-9 text-right" style={{ color: INK }}>
        {percentage != null ? `${pct}%` : '—'}
      </span>
    </div>
  );
}

// ── Main document ────────────────────────────────────────────────────────────

interface ReportCardDocumentProps {
  reportCard: ReportCard;
  student: Student;
  exam: Exam;
  schoolSettings?: SchoolSettings;
  qrDataUri?: string;
  /** Hides internal-only QA warnings — always true for the printed page, only
   *  false in the teacher's own edit/preview view. */
  hideWarnings?: boolean;
}

export function ReportCardDocument({ reportCard, student, exam, schoolSettings, qrDataUri, hideWarnings = true }: ReportCardDocumentProps) {
  const branding = schoolSettings?.reportCardBranding;
  const schoolName = schoolSettings?.schoolName || 'School Name';
  const logoUrl = schoolSettings?.logoUrl;
  const { summary, attendance, subjects } = reportCard;
  const scoredSubjects = subjects.filter((s) => typeof s.percentage === 'number');

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
          <p className="text-[13px] font-bold tracking-tight" style={{ color: INK }}>Student Report Card</p>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
            {EXAM_TYPE_LABELS[exam.examType]}{exam.termLabel ? ` · ${exam.termLabel}` : ''} · {exam.name}
          </p>
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
          <InfoField label="Date of Birth" value={fmtDate(student.dateOfBirth)} />
          <InfoField label="Gender" value={student.gender ? student.gender[0].toUpperCase() + student.gender.slice(1) : '—'} />
          <InfoField label="Father's Name" value={student.fatherName} />
          <InfoField label="Mother's Name" value={student.motherName} />
          <InfoField label="Contact Number" value={student.parentPhone} />
        </div>
      </div>

      {/* ── Academic performance ───────────────────────────────────────── */}
      <SectionLabel>Academic Performance</SectionLabel>
      <table className="w-full border-collapse mb-5">
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${NAVY}` }}>
            <th className="text-left py-1.5 text-[9px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>Subject</th>
            <th className="text-right py-1.5 text-[9px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>Max Marks</th>
            <th className="text-right py-1.5 text-[9px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>Obtained</th>
            <th className="text-right py-1.5 text-[9px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>Grade</th>
            <th className="text-right py-1.5 text-[9px] uppercase tracking-wide font-semibold" style={{ color: MUTED }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => {
            const showMarks = s.evaluationType === 'marks' || s.evaluationType === 'both';
            const showGrade = s.evaluationType === 'grade' || s.evaluationType === 'both';
            return (
              <tr key={s.subjectName} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td className="py-2 font-medium">{s.subjectName}</td>
                <td className="py-2 text-right" style={{ color: MUTED }}>{showMarks ? s.maxMarks ?? '—' : '—'}</td>
                <td className="py-2 text-right font-semibold">{showMarks ? s.marksObtained ?? '—' : '—'}</td>
                <td className="py-2 text-right font-semibold" style={{ color: NAVY }}>{showGrade ? s.grade ?? '—' : '—'}</td>
                <td className="py-2 text-right text-[9.5px] uppercase tracking-wide" style={{ color: s.result === 'fail' ? '#B42318' : s.result === 'pass' ? '#0F7A4E' : FAINT }}>
                  {s.result === 'na' ? 'Pending' : s.result}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Performance summary tiles ──────────────────────────────────── */}
      <SectionLabel>Performance Summary</SectionLabel>
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        <StatTile label="Overall %" value={`${summary.percentage}%`} accent />
        <StatTile label="Overall Grade" value={summary.overallGrade ?? '—'} accent />
        <StatTile label="Total Marks" value={`${summary.totalObtained} / ${summary.totalMaxMarks}`} />
        <StatTile label="Class Rank" value={summary.rank ? `${summary.rank} of ${summary.classSize}` : '—'} />
        <StatTile label="Attendance" value={`${attendance.percent}%`} />
        <StatTile label="Promotion" value={PROMOTION_LABEL[summary.promotionStatus]} />
        <StatTile label="Highest in Class" value={summary.highestMarksPercent != null ? `${summary.highestMarksPercent}%` : '—'} />
        <StatTile label="Class Average" value={summary.classAveragePercent != null ? `${summary.classAveragePercent}%` : '—'} />
      </div>

      {/* ── Subject performance (minimal bar visualization) ────────────── */}
      {scoredSubjects.length > 0 && (
        <div className="mb-5">
          <SectionLabel>Subject Performance</SectionLabel>
          <div className="flex flex-col gap-2">
            {scoredSubjects.map((s) => <SubjectBar key={s.subjectName} name={s.subjectName} percentage={s.percentage} />)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-5">
        {/* ── Co-scholastic ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Co-Scholastic Areas</SectionLabel>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {reportCard.coScholastic.map((c) => (
              <div key={c.activity} className="flex items-center justify-between py-1" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <span className="text-[10px]" style={{ color: MUTED }}>{c.activity}</span>
                <span className="text-[11px] font-bold" style={{ color: NAVY }}>{c.grade || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Attendance ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Attendance</SectionLabel>
          <div className="flex items-center gap-5">
            <CircularAttendance percent={attendance.percent} size={76} strokeWidth={6} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]" style={{ color: MUTED }}>
              <span>Working Days: <b style={{ color: INK }}>{attendance.workingDays}</b></span>
              <span>Present: <b style={{ color: INK }}>{attendance.present}</b></span>
              <span>Absent: <b style={{ color: INK }}>{attendance.absent}</b></span>
              <span>Late: <b style={{ color: INK }}>{attendance.late}</b></span>
              <span>Half Day: <b style={{ color: INK }}>{attendance.halfDay}</b></span>
              <span>Leave: <b style={{ color: INK }}>{attendance.leaveApproved}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Remark ────────────────────────────────────────────────────── */}
      {reportCard.aiRemark?.text && (
        <div className="mb-5 rounded-xl p-4" style={{ border: `1px solid ${HAIRLINE}`, backgroundColor: TILE_BG }}>
          <div className="flex items-center justify-between mb-1.5">
            <SectionLabel>Class Teacher's Remark</SectionLabel>
            {!reportCard.aiRemark.edited && (
              <span className="text-[7.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ color: NAVY, border: `1px solid ${NAVY}` }}>AI Assisted</span>
            )}
          </div>
          <p className="text-[11px] italic leading-relaxed" style={{ color: INK }}>&ldquo;{reportCard.aiRemark.text}&rdquo;</p>
        </div>
      )}

      {(reportCard.principalRemark || reportCard.parentFeedback) && (
        <div className="grid grid-cols-2 gap-4 mb-5">
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

      {/* ── Signatures ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6 mt-10 pt-5" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
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
