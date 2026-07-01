import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Phone,
  MessageCircle,
  StickyNote,
  MessageSquare,
  User,
  Users,
  MapPin,
  FileText,
  Tag,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudent } from '../hooks/useStudents';
import { ProfileHeader } from '../components/ProfileHeader';
import { InfoCard } from '../components/InfoCard';
import { StudentNotesPanel } from '../components/StudentNotesPanel';
import { CommunicationTimeline } from '@/features/communication/components/CommunicationTimeline';
import { useCommunicationList } from '@/features/communication/hooks/useCommunication';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useStudentAttendanceHistory, useAttendanceSummary } from '@/features/attendance/hooks/useAttendance';
import { AttendanceCalendar } from '@/features/attendance/components/AttendanceCalendar';
import { AttendanceSummaryCard } from '@/features/attendance/components/AttendanceSummaryCard';

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'notes' | 'communications' | 'attendance';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',       label: 'Overview' },
  { id: 'notes',          label: 'Notes' },
  { id: 'communications', label: 'Communications' },
  { id: 'attendance',     label: 'Attendance' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const GENDER_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const StudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: student, isLoading, isError } = useStudent(id!);
  const { data: comms = [] } = useCommunicationList(activeTab === 'communications' ? id! : null);

  const isAttendanceTab = activeTab === 'attendance';

  const { data: attendanceHistory, isLoading: attendanceLoading } = useStudentAttendanceHistory(
    id!,
    { limit: 365 },
  );
  const { data: attendanceSummary } = useAttendanceSummary(
    { studentId: id },
    isAttendanceTab,
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading student profile…</p>
        </div>
      </PageContainer>
    );
  }

  if (isError || !student) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Student not found</h2>
            <p className="text-sm text-gray-500 mt-1">
              This student may have been removed or the link is incorrect.
            </p>
          </div>
          <button
            onClick={() => navigate('/students')}
            className="mt-2 h-11 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors"
          >
            Back to Students
          </button>
        </div>
      </PageContainer>
    );
  }

  const dob = new Date(student.dateOfBirth).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const admittedOn = new Date(student.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <PageContainer>
      {/* Back */}
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        All Students
      </button>

      {/* Profile header */}
      <div className="mb-6">
        <ProfileHeader student={student} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => navigate(`/students/${student._id}/edit`)}
          className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     flex items-center gap-2.5 text-sm font-bold text-white transition-colors duration-150"
          type="button"
        >
          <Pencil className="w-4 h-4" />
          Edit Student
        </button>
        <button
          onClick={() => navigate(`/students/${student._id}/communications?action=call`)}
          className="h-12 px-6 rounded-xl bg-green-50 hover:bg-green-100
                     flex items-center gap-2.5 text-sm font-bold text-green-700 border border-green-200 transition-colors duration-150"
          type="button"
        >
          <Phone className="w-4 h-4" />
          Call Parent
        </button>
        <button
          onClick={() => navigate(`/students/${student._id}/communications?action=whatsapp`)}
          className="h-12 px-6 rounded-xl bg-emerald-50 hover:bg-emerald-100
                     flex items-center gap-2.5 text-sm font-bold text-emerald-700 border border-emerald-200 transition-colors duration-150"
          type="button"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={() => {
            setActiveTab('notes');
          }}
          className="h-12 px-6 rounded-xl bg-indigo-50 hover:bg-indigo-100
                     flex items-center gap-2.5 text-sm font-bold text-indigo-700 border border-indigo-200 transition-colors duration-150"
          type="button"
        >
          <StickyNote className="w-4 h-4" />
          Add Note
        </button>
        <button
          onClick={() => setActiveTab('communications')}
          className="h-12 px-6 rounded-xl bg-gray-50 hover:bg-gray-100
                     flex items-center gap-2.5 text-sm font-bold text-gray-600 border border-gray-200 transition-colors duration-150"
          type="button"
        >
          <MessageSquare className="w-4 h-4" />
          Communications
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'h-11 px-5 text-sm font-semibold transition-colors rounded-t-xl',
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <InfoCard
            title="Student Details"
            icon={User}
            items={[
              { label: 'Full Name', value: student.fullName },
              { label: 'Admission No.', value: student.admissionNumber },
              { label: 'Class', value: `Class ${student.class} — Section ${student.section}` },
              { label: 'Gender', value: GENDER_LABEL[student.gender] },
              { label: 'Date of Birth', value: dob },
              { label: 'Admission Year', value: String(student.admissionYear ?? '—') },
              { label: 'Admitted On', value: admittedOn },
              { label: 'Status', value: student.admissionStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
            ]}
          />

          <InfoCard
            title="Parent Details"
            icon={Users}
            items={[
              { label: "Father's Name", value: student.fatherName },
              { label: "Mother's Name", value: student.motherName },
              { label: 'Primary Phone', value: student.parentPhone },
              { label: 'Alternate Phone', value: student.alternatePhone },
              { label: 'Email', value: student.email },
            ]}
          />

          {student.emergencyContact && (
            <InfoCard
              title="Emergency Contact"
              icon={Phone}
              items={[
                { label: 'Name', value: student.emergencyContact.name },
                { label: 'Phone', value: student.emergencyContact.phone },
                { label: 'Relation', value: student.emergencyContact.relation },
              ]}
            />
          )}

          {student.address && (
            <InfoCard
              title="Address"
              icon={MapPin}
              items={[{ label: 'Home Address', value: student.address }]}
            />
          )}

          {student.tags && student.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {student.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {student.remarks && (
            <InfoCard
              title="Remarks"
              icon={FileText}
              items={[{ label: 'Notes', value: student.remarks }]}
            />
          )}
        </div>
      )}

      {/* ── Notes tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <StudentNotesPanel studentId={student._id} />
      )}

      {/* ── Communications tab ────────────────────────────────────────────── */}
      {activeTab === 'communications' && (
        <CommunicationTimeline communications={comms} />
      )}

      {/* ── Attendance tab ────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {attendanceSummary && (
            <AttendanceSummaryCard summary={attendanceSummary} label="Overall Attendance" />
          )}
          <AttendanceCalendar
            records={attendanceHistory?.data ?? []}
            loading={attendanceLoading}
          />
        </div>
      )}
    </PageContainer>
  );
};
