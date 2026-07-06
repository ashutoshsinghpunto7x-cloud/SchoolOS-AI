import { useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { AddFeeModal } from './AddFeeModal';
import type { Student, FeeRecord } from '@schoolos/types';

interface Props {
  onClose: () => void;
  onAssigned: (fee: FeeRecord) => void;
}

/** Fee Management's entry point for assigning a brand-new fee: pick a student, then fill in the fee. */
export function AssignFeeModal({ onClose, onAssigned }: Props) {
  const [search, setSearch] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const { data, isLoading } = useStudentsPaginated({ search: search || undefined, status: 'active', limit: 15 });

  const results = data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Assign New Fee</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {!student ? (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student by name, roll no., or admission no."
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5CEB]/30"
              />
            </div>
            {isLoading ? (
              <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : !results.length ? (
              <p className="text-xs text-gray-400 text-center py-4">{search ? 'No students match.' : 'Start typing to search for a student.'}</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {results.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => setStudent(s)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-[#5B5CEB]/40 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#5B5CEB]/10 flex items-center justify-center text-[#5B5CEB] font-bold text-xs shrink-0">
                      {s.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.fullName}</p>
                      <p className="text-xs text-gray-400">Class {s.class}-{s.section} · Roll {s.rollNumber || '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setStudent(null)} className="text-xs font-semibold text-[#5B5CEB] hover:underline mb-3">
              ← Choose a different student
            </button>
            <p className="text-sm font-semibold text-gray-800 mb-3">{student.fullName} · Class {student.class}-{student.section}</p>
            <AddFeeModal
              studentId={student._id}
              defaultAmount={student.monthlyTuitionFee}
              onCreated={(fee) => onAssigned(fee)}
            />
          </>
        )}
      </div>
    </div>
  );
}
