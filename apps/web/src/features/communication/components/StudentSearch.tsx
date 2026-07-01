import { useState } from 'react';
import { Search, GraduationCap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudentList } from '@/features/students/hooks/useStudents';
import type { Student } from '@schoolos/types';

interface StudentSearchProps {
  selectedStudent: Student | null;
  onSelect: (student: Student) => void;
}

export const StudentSearch = ({ selectedStudent, onSelect }: StudentSearchProps) => {
  const [query, setQuery] = useState('');
  const { data: students = [], isLoading } = useStudentList();

  const filtered = query.trim()
    ? students.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.admissionNumber.toLowerCase().includes(q) ||
          s.parentPhone.includes(q)
        );
      })
    : students;

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-4 flex-shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student…"
            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl
                       text-sm text-gray-900 placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                       transition-colors"
          />
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-2 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {query ? 'Results' : 'All Students'}
        </p>
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-10 px-3">
            <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {query ? 'No students found' : 'No students yet'}
            </p>
          </div>
        )}

        {!isLoading &&
          filtered.map((student) => {
            const isSelected = selectedStudent?._id === student._id;
            const initials = student.fullName
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase();

            return (
              <button
                key={student._id}
                onClick={() => onSelect(student)}
                type="button"
                className={cn(
                  'w-full text-left rounded-xl px-3 py-3 mb-1',
                  'flex items-center gap-3',
                  'transition-all duration-150',
                  isSelected
                    ? 'bg-blue-600 shadow-md'
                    : 'hover:bg-gray-100'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold truncate leading-tight',
                      isSelected ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    {student.fullName}
                  </p>
                  <p
                    className={cn(
                      'text-xs truncate mt-0.5',
                      isSelected ? 'text-blue-200' : 'text-gray-500'
                    )}
                  >
                    Class {student.class} · {student.parentPhone}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
};
