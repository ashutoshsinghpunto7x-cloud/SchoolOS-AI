import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Phone, StickyNote,
  Briefcase, BookOpen, Tag, MapPin, FileText,
  Loader2, AlertCircle, GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacher } from '../hooks/useTeachers';
import { EmploymentStatusBadge } from '../components/EmploymentStatusBadge';
import { TeacherNotesPanel } from '../components/TeacherNotesPanel';
import { LinkUserAccountCard } from '../components/LinkUserAccountCard';
import { PageContainer } from '@/components/workspace/PageContainer';
import { InfoCard } from '@/features/students/components/InfoCard';

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'notes',    label: 'Notes' },
];

const GENDER_LABEL: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };

const fmt = (dateStr?: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : undefined;

// ── Page ──────────────────────────────────────────────────────────────────────

export const TeacherProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: teacher, isLoading, isError } = useTeacher(id!);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !teacher) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Teacher not found</h2>
            <p className="text-sm text-gray-500 mt-1">This record may have been removed.</p>
          </div>
          <button onClick={() => navigate('/teachers')}
            className="mt-2 h-11 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors">
            Back to Teachers
          </button>
        </div>
      </PageContainer>
    );
  }

  const initials = teacher.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <PageContainer>
      {/* Back */}
      <button onClick={() => navigate('/teachers')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button">
        <ArrowLeft className="w-4 h-4" />
        All Teachers
      </button>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-3xl font-bold text-white tracking-tight">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                {teacher.fullName}
              </h1>
              <div className="mt-1">
                <EmploymentStatusBadge status={teacher.employmentStatus} size="md" />
              </div>
            </div>
            <p className="text-base font-semibold text-indigo-600 mt-1.5">{teacher.employeeId}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm font-medium text-gray-600">
              {teacher.department && (
                <>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                    {teacher.department}
                  </div>
                  <span className="text-gray-200">|</span>
                </>
              )}
              <span>{GENDER_LABEL[teacher.gender]}</span>
              {teacher.experienceYears !== undefined && (
                <>
                  <span className="text-gray-200">|</span>
                  <span>{teacher.experienceYears} yr{teacher.experienceYears !== 1 ? 's' : ''} exp.</span>
                </>
              )}
            </div>
            {teacher.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {teacher.subjects.map((s) => (
                  <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => navigate(`/teachers/${teacher._id}/edit`)}
          className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 flex items-center gap-2.5 text-sm font-bold text-white transition-colors"
          type="button">
          <Pencil className="w-4 h-4" />
          Edit Teacher
        </button>
        <button onClick={() => setActiveTab('notes')}
          className="h-12 px-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 flex items-center gap-2.5 text-sm font-bold text-indigo-700 border border-indigo-200 transition-colors"
          type="button">
          <StickyNote className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 -mx-1 px-1">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={cn('h-11 px-5 text-sm font-semibold transition-colors rounded-t-xl',
              activeTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px bg-indigo-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <InfoCard title="Personal Details" icon={GraduationCap} items={[
            { label: 'Full Name',    value: teacher.fullName },
            { label: 'Employee ID', value: teacher.employeeId },
            { label: 'Gender',      value: GENDER_LABEL[teacher.gender] },
            { label: 'Date of Birth', value: fmt(teacher.dateOfBirth) },
            { label: 'Joining Date',  value: fmt(teacher.joiningDate) },
            { label: 'Experience',    value: teacher.experienceYears !== undefined ? `${teacher.experienceYears} years` : undefined },
            { label: 'Status',        value: teacher.employmentStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
          ]} />

          <InfoCard title="Contact Details" icon={Phone} items={[
            { label: 'Primary Phone',   value: teacher.phone },
            { label: 'Alternate Phone', value: teacher.alternatePhone },
            { label: 'Email',           value: teacher.email },
          ]} />

          <InfoCard title="Professional" icon={Briefcase} items={[
            { label: 'Department',       value: teacher.department },
            { label: 'Subjects',         value: teacher.subjects.join(', ') || undefined },
            { label: 'Assigned Classes', value: teacher.assignedClasses.join(', ') || undefined },
          ]} />

          {teacher.qualification && (
            <InfoCard title="Qualification" icon={BookOpen} items={[
              { label: 'Degree',           value: teacher.qualification.degree },
              { label: 'Institution',      value: teacher.qualification.institution },
              { label: 'Year of Passing',  value: teacher.qualification.yearOfPassing?.toString() },
            ]} />
          )}

          {teacher.emergencyContact && (
            <InfoCard title="Emergency Contact" icon={Phone} items={[
              { label: 'Name',     value: teacher.emergencyContact.name },
              { label: 'Phone',    value: teacher.emergencyContact.phone },
              { label: 'Relation', value: teacher.emergencyContact.relation },
            ]} />
          )}

          {teacher.address && (
            <InfoCard title="Address" icon={MapPin} items={[
              { label: 'Home Address', value: teacher.address },
            ]} />
          )}

          {teacher.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-indigo-600" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {teacher.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {teacher.remarks && (
            <InfoCard title="Remarks" icon={FileText} items={[
              { label: 'Notes', value: teacher.remarks },
            ]} />
          )}

          <LinkUserAccountCard teacher={teacher} />
        </div>
      )}

      {/* ── Notes tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <TeacherNotesPanel teacherId={teacher._id} />
      )}
    </PageContainer>
  );
};
