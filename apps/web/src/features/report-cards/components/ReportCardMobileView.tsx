import { Share2, Download } from 'lucide-react';
import { CircularAttendance } from './CircularAttendance';
import type { ReportCard, Student, Exam, SchoolSettings } from '@schoolos/types';

const NAVY = '#1C2B4A';
const INK = '#14161A';
const MUTED = '#6B7280';

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const EXAM_TYPE_LABELS: Record<Exam['examType'], string> = {
  unit_test: 'Unit Test', monthly_test: 'Monthly Test', half_yearly: 'Half Yearly',
  annual: 'Annual Examination', practical: 'Practical', internal_assessment: 'Internal Assessment', other: 'Examination',
};

interface ReportCardMobileViewProps {
  reportCard: ReportCard;
  student: Student;
  exam: Exam;
  schoolSettings?: SchoolSettings;
  onDownload?: () => void;
  onShare?: () => void;
}

/** Parent-facing mobile view — a stack of app-style cards rather than a
 *  scaled-down A4 page, matching how parents actually consume this on a
 *  phone (scroll, not zoom-and-pan a document). */
export function ReportCardMobileView({ reportCard, student, exam, schoolSettings, onDownload, onShare }: ReportCardMobileViewProps) {
  const { summary, attendance, subjects } = reportCard;

  return (
    <div className="max-w-md mx-auto bg-[#F5F6F8] min-h-screen pb-8">
      {/* Header card */}
      <div className="bg-white px-5 pt-6 pb-5 rounded-b-3xl" style={{ boxShadow: '0 1px 0 #ECEDF0' }}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center bg-[#F0F1F4]">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-[15px]" style={{ color: NAVY }}>{initials(student.fullName)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[16px] truncate" style={{ color: INK }}>{student.fullName}</p>
            <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>Class {student.class} – {student.section} · Roll {student.rollNumber ?? '—'}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold" style={{ color: NAVY }}>{schoolSettings?.schoolName || 'School'}</p>
            <p className="text-[10.5px]" style={{ color: MUTED }}>{EXAM_TYPE_LABELS[exam.examType]} · {exam.name}</p>
          </div>
        </div>
      </div>

      {/* Performance summary cards */}
      <div className="grid grid-cols-2 gap-3 px-5 mt-4">
        <div className="bg-white rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Overall</p>
          <p className="text-[24px] font-bold mt-1" style={{ color: NAVY }}>{summary.percentage}%</p>
          <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Grade {summary.overallGrade ?? '—'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Class Rank</p>
          <p className="text-[24px] font-bold mt-1" style={{ color: INK }}>{summary.rank ?? '—'}</p>
          <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>of {summary.classSize ?? '—'} students</p>
        </div>
        <div className="bg-white rounded-2xl p-4 col-span-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Attendance</p>
            <p className="text-[13px] font-semibold mt-1" style={{ color: INK }}>{attendance.present} / {attendance.workingDays} days present</p>
          </div>
          <CircularAttendance percent={attendance.percent} size={64} strokeWidth={5} />
        </div>
      </div>

      {/* Subjects */}
      <div className="px-5 mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: MUTED }}>Subjects</p>
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F0F1F4]">
          {subjects.map((s) => {
            const showMarks = s.evaluationType === 'marks' || s.evaluationType === 'both';
            const showGrade = s.evaluationType === 'grade' || s.evaluationType === 'both';
            return (
              <div key={s.subjectName} className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-medium" style={{ color: INK }}>{s.subjectName}</span>
                <div className="text-right">
                  {showMarks && <p className="text-[13px] font-semibold" style={{ color: INK }}>{s.marksObtained ?? '—'}/{s.maxMarks ?? '—'}</p>}
                  {showGrade && <p className="text-[11px]" style={{ color: NAVY }}>{s.grade ?? '—'}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remark */}
      {reportCard.aiRemark?.text && (
        <div className="px-5 mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: MUTED }}>Teacher's Remark</p>
          <div className="bg-white rounded-2xl p-4">
            <p className="text-[13px] italic leading-relaxed" style={{ color: INK }}>&ldquo;{reportCard.aiRemark.text}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 mt-6 flex gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="flex-1 h-11 rounded-xl text-white text-[13px] font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: NAVY }}
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex-1 h-11 rounded-xl bg-white text-[13px] font-semibold flex items-center justify-center gap-2"
          style={{ color: INK, border: '1px solid #E5E6EA' }}
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>
    </div>
  );
}
