import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  User2,
  Phone,
  Mail,
  Building2,
  BookOpen,
  GraduationCap,
  Briefcase,
  BadgeCheck,
  UserPlus,
  Settings,
  LogOut,
} from 'lucide-react';
import { useTeacherWorkspace } from '../hooks/useTeacherWorkspace';
import { useAuth } from '@/features/auth/hooks/useAuth';

const STATUS_LABEL: Record<string, string> = {
  active:      'Active',
  on_leave:    'On Leave',
  applicant:   'Applicant',
  suspended:   'Suspended',
  resigned:    'Resigned',
  retired:     'Retired',
  inactive:    'Inactive',
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-colors ${
        danger ? 'hover:bg-red-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        danger ? 'bg-red-50' : 'bg-gray-100'
      }`}>
        <Icon className={`w-4.5 h-4.5 ${danger ? 'text-red-500' : 'text-gray-500'}`} />
      </div>
      <span className={`flex-1 text-left text-sm font-semibold ${danger ? 'text-red-600' : 'text-gray-800'}`}>
        {label}
      </span>
    </button>
  );
}

export function TeacherProfilePage() {
  const navigate              = useNavigate();
  const { logout }            = useAuth();
  const { data, isLoading }   = useTeacherWorkspace();
  const teacher                = data?.teacher;
  const [infoOpen, setInfoOpen] = useState(false);

  const initials = teacher
    ? teacher.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const totalClassesToday = data?.attendanceSummary.totalClassesToday ?? 0;
  const markedToday       = data?.attendanceSummary.classesMarkedToday ?? 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/teacher')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900">My Profile</h1>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-4 animate-pulse">
          <div className="bg-white rounded-2xl h-32" />
          <div className="bg-white rounded-2xl h-40" />
        </div>
      ) : !teacher ? (
        <div className="p-6 text-center text-gray-400 mt-10">
          <User2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Profile not found</p>
        </div>
      ) : (
        <div className="px-4 py-5 space-y-4">
          {/* Avatar card */}
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 45%, #DB2777 100%)' }}
          >
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <h2 className="text-xl font-bold text-white">{teacher.fullName}</h2>
            <p className="text-white/70 text-sm mt-1">Employee ID: {teacher.employeeId}</p>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                teacher.employmentStatus === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-white/20 text-white/80'
              }`}
            >
              {STATUS_LABEL[teacher.employmentStatus] ?? teacher.employmentStatus}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Classes Today',   value: String(totalClassesToday) },
              { label: 'Marked Today',    value: String(markedToday) },
              { label: 'Subjects',        value: String(teacher.subjects.length) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Personal Info — collapsed by default; tap the row to open it */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <User2 className="w-4.5 h-4.5 text-gray-500" />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-gray-800">Personal Info</span>
              {infoOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {infoOpen && (
              <div className="border-t border-gray-100 px-4 pb-4">
                {/* Contact & Info */}
                <div className="pt-1">
                  <InfoRow icon={Phone}     label="Phone"      value={teacher.phone} />
                  <InfoRow icon={Mail}      label="Email"      value={teacher.email} />
                  <InfoRow icon={Building2} label="Department" value={teacher.department} />
                </div>

                {/* Subjects */}
                {teacher.subjects.length > 0 && (
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-[#5B21B6]" />
                      <p className="text-sm font-bold text-gray-800">Subjects</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects.map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1.5 bg-[#A855F7]/10 text-[#5B21B6] rounded-xl text-sm font-medium border border-[#A855F7]/20"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Classes */}
                {teacher.assignedClasses.length > 0 && (
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap className="w-4 h-4 text-[#5B21B6]" />
                      <p className="text-sm font-bold text-gray-800">Assigned Classes</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {teacher.assignedClasses.map((c) => (
                        <span
                          key={c}
                          className="px-3 py-1.5 bg-[#A855F7]/10 text-[#5B21B6] rounded-xl text-sm font-medium border border-[#A855F7]/20"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Week summary */}
                {data && (
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-[#5B21B6]" />
                      <p className="text-sm font-bold text-gray-800">Weekly Load</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, i) => {
                        const count = data.weekSchedule[i]?.entries.length ?? 0;
                        return (
                          <div key={name} className="shrink-0 text-center w-10">
                            <p className="text-xs text-gray-400 font-medium">{name}</p>
                            <div
                              className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                                count > 0
                                  ? 'bg-[#A855F7]/10 text-[#5B21B6]'
                                  : 'bg-gray-100 text-gray-300'
                              }`}
                            >
                              {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Other options moved here from the old sidebar */}
          <div className="space-y-2">
            <MenuRow icon={UserPlus} label="Add Students" onClick={() => navigate('/teacher/add-student')} />
            <MenuRow icon={Settings} label="Settings"      onClick={() => navigate('/settings')} />
            <MenuRow icon={LogOut}   label="Log Out"       onClick={() => void logout()} danger />
          </div>

          {/* Employee badge */}
          <div className="flex items-center justify-center gap-2 py-2">
            <BadgeCheck className="w-4 h-4 text-gray-300" />
            <p className="text-xs text-gray-400">FNIC · Teacher Portal</p>
          </div>
        </div>
      )}
    </div>
  );
}
