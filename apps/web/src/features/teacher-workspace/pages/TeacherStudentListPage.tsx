import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Trash2,
  GraduationCap,
  AlertCircle,
  Users,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { useStudentsPaginated, useDeleteStudent, useUpdateRollNumber } from '@/features/students/hooks/useStudents';
import { TeacherEditStudentModal } from '../components/TeacherEditStudentModal';
import type { Student } from '@schoolos/types';
import { cn } from '@/lib/utils';

// ── Roll number inline edit ─────────────────────────────────────────────────

function RollNumberEditor({ student }: { student: Student }) {
  const { mutateAsync, isPending } = useUpdateRollNumber(student._id);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(student.rollNumber ?? '');

  async function save() {
    await mutateAsync(value.trim() || undefined);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          placeholder="Roll no."
          className="w-16 h-7 px-2 rounded-lg border border-[#5B5CEB] text-xs focus:outline-none"
        />
        <button onClick={save} disabled={isPending} className="w-6 h-6 flex items-center justify-center rounded-md bg-[#5B5CEB] text-white shrink-0">
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button onClick={() => setEditing(false)} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(student.rollNumber ?? ''); setEditing(true); }}
      className="flex items-center gap-1 shrink-0 text-xs font-semibold text-gray-500 hover:text-[#5B5CEB] px-2 py-1 rounded-lg hover:bg-[#5B5CEB]/5"
      title="Edit roll number"
    >
      Roll {student.rollNumber || '—'} <Pencil className="w-3 h-3" />
    </button>
  );
}

// ── Student card ─────────────────────────────────────────────────────────────

function StudentCard({
  student,
  index,
  onDelete,
  onEdit,
}: {
  student: Student;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (student: Student) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initials = student.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      {/* Rank */}
      <span className="text-xs text-gray-400 w-6 text-right shrink-0">{index + 1}</span>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-[#5B5CEB]/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[#5B5CEB]">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{student.fullName}</p>
        <p className="text-xs text-gray-400">Adm: {student.admissionNumber}</p>
        {student.gender && (
          <p className="text-xs text-gray-400 capitalize">{student.gender}</p>
        )}
      </div>

      <RollNumberEditor student={student} />

      {/* Status badge */}
      <span
        className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
          student.admissionStatus === 'active'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-gray-100 text-gray-500',
        )}
      >
        {student.admissionStatus}
      </span>

      {/* Edit + Delete */}
      {confirmDelete ? (
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { onDelete(student._id); setConfirmDelete(false); }}
            className="h-8 px-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="h-8 px-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(student)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:bg-[#5B5CEB]/10 hover:text-[#5B5CEB] transition-colors"
            title="Request an edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Remove student"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 animate-pulse">
      <div className="w-6 h-4 bg-gray-100 rounded" />
      <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-32" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TeacherStudentListPage() {
  const { cls, section } = useParams<{ cls: string; section: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const { data, isLoading, isError } = useStudentsPaginated({
    class: cls,
    section,
    status: 'active',
    limit: 300,
  });

  const { mutate: deleteStudent } = useDeleteStudent();

  const students: Student[] = data?.data ?? [];

  const filtered = students
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/teacher/classes')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Class {cls} – {section}</h1>
            <p className="text-sm text-gray-500">
              {isLoading ? '…' : `${students.length} students enrolled`}
            </p>
          </div>
          <button
            onClick={() => navigate(`/teacher/classes/${cls}/${section}/add-student`)}
            className="h-10 px-4 bg-[#5B5CEB] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-[#4a4bd9] transition-colors shrink-0"
            type="button"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Student</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/40 focus:border-[#5B5CEB] transition-colors"
          />
        </div>
      </div>

      {/* Student list */}
      <div className="px-4 py-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : isError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">Failed to load students</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {search ? (
                <Search className="w-7 h-7 text-gray-400" />
              ) : (
                <Users className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <p className="text-base font-semibold text-gray-700">
              {search ? 'No students match your search' : 'No students yet'}
            </p>
            {!search && (
              <button
                onClick={() => navigate(`/teacher/classes/${cls}/${section}/add-student`)}
                className="mt-4 h-10 px-6 bg-[#5B5CEB] text-white rounded-xl text-sm font-semibold hover:bg-[#4a4bd9] transition-colors"
              >
                Add First Student
              </button>
            )}
          </div>
        ) : (
          filtered.map((s, i) => (
            <StudentCard
              key={s._id}
              student={s}
              index={i}
              onDelete={(id) => deleteStudent(id)}
              onEdit={setEditingStudent}
            />
          ))
        )}
      </div>

      {editingStudent && (
        <TeacherEditStudentModal student={editingStudent} onClose={() => setEditingStudent(null)} />
      )}

      {/* Mark attendance FAB */}
      {students.length > 0 && (
        <div className="fixed bottom-24 right-4 lg:bottom-6">
          <button
            onClick={() => navigate(`/teacher/attendance/${cls}/${section}`)}
            className="h-14 px-5 bg-[#5B5CEB] text-white rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 hover:bg-[#4a4bd9] transition-all hover:scale-105 active:scale-95"
          >
            <GraduationCap className="w-5 h-5" />
            Mark Attendance
          </button>
        </div>
      )}
    </div>
  );
}
