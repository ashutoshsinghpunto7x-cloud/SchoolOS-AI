import { GraduationCap } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { Student } from '@schoolos/types';

const GENDER_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

interface ProfileHeaderProps {
  student: Student;
}

export const ProfileHeader = ({ student }: ProfileHeaderProps) => {
  const initials = student.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const dob = new Date(student.dateOfBirth).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-3xl font-bold text-white tracking-tight">{initials}</span>
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
              {student.fullName}
            </h1>
            <div className="mt-1">
              <StatusBadge status={student.admissionStatus} size="md" />
            </div>
          </div>

          <p className="text-base font-semibold text-blue-600 mt-1.5">
            {student.admissionNumber}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-medium text-gray-600">
                Class {student.class} — Section {student.section}
              </span>
            </div>
            <span className="text-gray-200 select-none">|</span>
            <span className="text-sm font-medium text-gray-600">{GENDER_LABEL[student.gender]}</span>
            <span className="text-gray-200 select-none">|</span>
            <span className="text-sm font-medium text-gray-500">DOB: {dob}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
