import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, Camera, X, GraduationCap,
  FolderKanban, Phone, MailIcon, MapPin, Briefcase, Hash,
} from 'lucide-react';
import { useTeacher, useUploadTeacherPhoto, useRemoveTeacherPhoto } from '@/features/teachers/hooks/useTeachers';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  active:      { label: 'Active',     classes: 'bg-emerald-100 text-emerald-800' },
  on_leave:    { label: 'On Leave',   classes: 'bg-amber-100 text-amber-800' },
  applicant:   { label: 'Applicant',  classes: 'bg-purple-100 text-purple-800' },
  suspended:   { label: 'Suspended',  classes: 'bg-red-100 text-red-700' },
  resigned:    { label: 'Resigned',   classes: 'bg-gray-100 text-gray-600' },
  retired:     { label: 'Retired',    classes: 'bg-gray-100 text-gray-600' },
  inactive:    { label: 'Inactive',   classes: 'bg-gray-100 text-gray-600' },
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export function AccountantTeacherProfilePage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: teacher, isLoading, isError } = useTeacher(teacherId!);
  const { mutateAsync: uploadPhoto, isPending: uploading } = useUploadTeacherPhoto(teacherId!);
  const { mutateAsync: removePhoto, isPending: removing } = useRemoveTeacherPhoto(teacherId!);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadPhoto(file);
    e.target.value = '';
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#5B21B6] animate-spin" />
      </div>
    );
  }

  if (isError || !teacher) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">Could not load this teacher's profile.</p>
        <button
          onClick={() => navigate('/accountant/teachers')}
          className="h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Back to Search
        </button>
      </div>
    );
  }

  const status = STATUS_LABELS[teacher.employmentStatus] ?? { label: teacher.employmentStatus, classes: 'bg-gray-100 text-gray-600' };
  const initials = teacher.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/accountant/teachers')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">Teacher Profile</h1>
          <p className="text-xs text-gray-500">{teacher.fullName} · {teacher.employeeId}</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-16 h-16 shrink-0 group">
                <div className="w-16 h-16 rounded-2xl bg-[#5B21B6] flex items-center justify-center overflow-hidden">
                  {teacher.photoUrl ? (
                    <img src={teacher.photoUrl} alt={teacher.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">{initials}</span>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => void handlePhotoChange(e)} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title={teacher.photoUrl ? 'Replace photo' : 'Add photo'}
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#5B21B6] hover:border-[#A855F7]/30 transition-colors"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                {teacher.photoUrl && (
                  <button
                    type="button"
                    onClick={() => void removePhoto()}
                    disabled={removing}
                    title="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{teacher.fullName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{teacher.employeeId}</p>
              </div>
            </div>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shrink-0', status.classes)}>
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 pt-4">
            <InfoRow icon={Briefcase}     label="Department" value={teacher.department} />
            <InfoRow icon={GraduationCap} label="Subjects" value={teacher.subjects.join(', ') || undefined} />
            <InfoRow icon={FolderKanban}  label="Assigned Classes" value={teacher.assignedClasses.join(', ') || undefined} />
            <InfoRow icon={Hash}          label="Experience" value={teacher.experienceYears !== undefined ? `${teacher.experienceYears} years` : undefined} />
            <InfoRow icon={Phone}         label="Phone" value={teacher.phone} />
            <InfoRow icon={MailIcon}      label="Email" value={teacher.email} />
            <InfoRow icon={MapPin}        label="Address" value={teacher.address} />
          </div>
        </div>
      </div>
    </div>
  );
}
