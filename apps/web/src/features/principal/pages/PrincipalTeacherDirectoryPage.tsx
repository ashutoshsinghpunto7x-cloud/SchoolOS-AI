import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowLeft, Users, Phone, Mail, BookOpen,
  ChevronRight, UserCheck, CalendarOff, Loader2, AlertCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { BackLink } from '@/components/workspace/BackLink';
import { useTeachersPaginated, useTeacher } from '@/features/teachers/hooks/useTeachers';
import { useTeachersSummary } from '../hooks/usePrincipal';
import type { Teacher } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-sky-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500',
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const STATUS_PILL: Record<string, string> = {
  active:      'bg-emerald-100 text-emerald-700',
  on_leave:    'bg-amber-100 text-amber-700',
  inactive:    'bg-gray-100 text-gray-500',
  resigned:    'bg-red-100 text-red-600',
  terminated:  'bg-red-100 text-red-600',
};

// ── Teacher row ───────────────────────────────────────────────────────────────

function TeacherRow({ teacher, onSelect }: { teacher: Teacher; onSelect: () => void }) {
  const color = avatarColor(teacher._id);
  const statusKey = teacher.employmentStatus ?? 'active';
  const pillCls = STATUS_PILL[statusKey] ?? STATUS_PILL.active;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors text-left group"
    >
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden', color)}>
        {teacher.photoUrl ? (
          <img src={teacher.photoUrl} alt={teacher.fullName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="text-sm font-bold text-white">{initials(teacher.fullName)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{teacher.fullName}</p>
        <p className="text-xs text-gray-400 truncate">
          {teacher.employeeId} · {teacher.subjects?.join(', ') || 'No subjects assigned'}
        </p>
      </div>
      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0', pillCls)}>
        {statusKey.replace('_', ' ')}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
    </button>
  );
}

// ── Teacher Detail Panel ───────────────────────────────────────────────────────

function TeacherDetailPanel({ teacherId, onBack }: { teacherId: string; onBack: () => void }) {
  const navigate = useNavigate();
  const { data: teacher, isLoading, isError } = useTeacher(teacherId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
      </div>
    );
  }
  if (isError || !teacher) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-5 mt-4">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm font-semibold text-red-700">Couldn't load teacher details.</p>
      </div>
    );
  }

  const color = avatarColor(teacher._id);
  const statusKey = teacher.employmentStatus ?? 'active';
  const pillCls = STATUS_PILL[statusKey] ?? STATUS_PILL.active;

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-5 -ml-1"
      >
        <ArrowLeft className="w-4 h-4" /> All Teachers
      </button>

      {/* Profile header */}
      <div className="bg-gradient-to-br from-[#4C1D95] to-[#DB2777] rounded-2xl p-5 text-white mb-5">
        <div className="flex items-center gap-4">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden', color)}>
            {teacher.photoUrl ? (
              <img src={teacher.photoUrl} alt={teacher.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-white">{initials(teacher.fullName)}</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{teacher.fullName}</h2>
            <p className="text-sm text-white/70">{teacher.employeeId}</p>
            <span className={cn('inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', pillCls)}>
              {statusKey.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Contact & basics */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Phone" value={teacher.phone} />
          <InfoRow label="Email" value={teacher.email} />
          <InfoRow label="Gender" value={teacher.gender} />
          <InfoRow label="Address" value={teacher.address} />
          <InfoRow label="Joined" value={teacher.joiningDate} />
          <InfoRow label="Department" value={teacher.department} />
          <InfoRow label="Experience" value={teacher.experienceYears ? `${teacher.experienceYears} yrs` : undefined} />
        </div>
        {teacher.subjects?.length ? (
          <div className="mt-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Subjects</p>
            <div className="flex flex-wrap gap-1.5">
              {teacher.subjects.map((s) => (
                <span key={s} className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => navigate(`/timetable/teacher/${teacher._id}`)}
          className="flex items-center gap-1.5 h-9 px-3 bg-violet-50 text-[#5B21B6] rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" /> View Timetable
        </button>
        {teacher.phone && (
          <a
            href={`tel:${teacher.phone}`}
            className="flex items-center gap-1.5 h-9 px-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" /> Call
          </a>
        )}
        {teacher.email && (
          <a
            href={`mailto:${teacher.email}`}
            className="flex items-center gap-1.5 h-9 px-3 bg-sky-50 text-sky-700 rounded-xl text-xs font-semibold hover:bg-sky-100 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" /> Email
          </a>
        )}
        <button
          onClick={() => navigate(`/teachers/${teacher._id}`)}
          className="flex items-center gap-1.5 h-9 px-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
        >
          Full Profile →
        </button>
      </div>

      {/* Qualification */}
      {teacher.qualification && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Qualification</h3>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-800">{teacher.qualification.degree}</span>
            <span className="text-xs text-gray-400">
              {teacher.qualification.institution}
              {teacher.qualification.yearOfPassing ? ` · ${teacher.qualification.yearOfPassing}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PrincipalTeacherDirectoryPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useTeachersPaginated({ search: search || undefined, limit: 100 });
  const { data: summary } = useTeachersSummary();

  const teachers = data?.data ?? [];

  if (selectedId) {
    return (
      <PageContainer>
        <TeacherDetailPanel teacherId={selectedId} onBack={() => setSelectedId(null)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackLink to="/principal" label="Principal Dashboard" />

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {summary ? `${summary.total} total · ${summary.presentCount} present · ${summary.onLeave.length} on leave` : 'Loading…'}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#5B21B6]" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{summary.total}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{summary.presentCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Present</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <CalendarOff className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{summary.onLeave.length}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">On Leave</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, subject, or employee ID…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7]/40 bg-white"
        />
      </div>

      {/* Teacher list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">Couldn't load teacher list.</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">No teachers found</p>
            {search && <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {teachers.map((t) => (
              <TeacherRow key={t._id} teacher={t} onSelect={() => setSelectedId(t._id)} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
