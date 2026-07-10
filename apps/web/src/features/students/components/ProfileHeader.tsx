import { useRef } from 'react';
import { GraduationCap, Camera, X, Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUploadStudentPhoto, useRemoveStudentPhoto } from '../hooks/useStudents';
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
  const { user } = useAuth();
  const canManagePhoto = user?.role === 'admin' || user?.role === 'reception' || user?.role === 'accountant';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadPhoto, isPending: uploading } = useUploadStudentPhoto(student._id);
  const { mutateAsync: removePhoto, isPending: removing } = useRemoveStudentPhoto(student._id);

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadPhoto(file);
    e.target.value = '';
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative w-24 h-24 flex-shrink-0 group">
          <div className="w-24 h-24 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md overflow-hidden">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white tracking-tight">{initials}</span>
            )}
          </div>
          {canManagePhoto && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => void handleFileChange(e)} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title={student.photoUrl ? 'Replace photo' : 'Add photo'}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              {student.photoUrl && (
                <button
                  type="button"
                  onClick={() => void removePhoto()}
                  disabled={removing}
                  title="Remove photo"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          )}
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
