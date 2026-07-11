import { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Search, Mail } from 'lucide-react';
import { useTeachersPaginated } from '@/features/teachers/hooks/useTeachers';
import { useSendDefaultersToTeacher } from '../hooks/useAccountantWorkspace';
import type { ClassDefaulterGroup } from '@schoolos/types';
import { cn } from '@/lib/utils';

interface Props {
  group: ClassDefaulterGroup;
  onClose: () => void;
}

export function SendDefaultersModal({ group, onClose }: Props) {
  const [search, setSearch] = useState(group.classTeacherName || `${group.class}${group.section}`);
  const { data, isLoading } = useTeachersPaginated({ search, limit: 20 });
  const [teacherId, setTeacherId] = useState(group.classTeacherId ?? '');
  const { mutateAsync, isPending, error } = useSendDefaultersToTeacher();
  const [sent, setSent] = useState(false);

  const teachers = data?.data ?? [];

  async function handleSend() {
    if (!teacherId) return;
    await mutateAsync({ class: group.class, section: group.section, teacherId });
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900">Send to Class Teacher</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800">List sent!</p>
            <p className="text-xs text-gray-400 mt-1">The teacher will receive the defaulters list by email and in their in-app notifications.</p>
            <button onClick={onClose} className="mt-5 h-10 px-5 bg-[#5B21B6] text-white rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-1">
              Class {group.class}-{group.section} · {group.students.length} student{group.students.length !== 1 ? 's' : ''} pending
            </p>
            {group.classTeacherName && (
              <p className="text-xs text-gray-400 mb-3">Class teacher on file: <span className="font-semibold text-gray-600">{group.classTeacherName}</span> (pre-selected below)</p>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setTeacherId(''); }}
                placeholder="Search teacher by name"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
              />
            </div>

            {isLoading ? (
              <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : !teachers.length ? (
              <p className="text-xs text-gray-400 text-center py-4">No teachers found. Try a different search.</p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
                {teachers.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => setTeacherId(t._id)}
                    disabled={!t.email}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors disabled:opacity-40',
                      teacherId === t._id ? 'border-[#5B21B6] bg-[#A855F7]/5' : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{t.fullName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {t.email || 'No email on file'}
                      </p>
                    </div>
                    {teacherId === t._id && <CheckCircle2 className="w-4 h-4 text-[#5B21B6] shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error instanceof Error ? error.message : 'Failed to send'}
              </div>
            )}

            <button
              type="button"
              disabled={!teacherId || isPending}
              onClick={handleSend}
              className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {isPending ? 'Sending…' : 'Send List'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
