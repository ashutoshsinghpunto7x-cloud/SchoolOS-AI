import { Pencil, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmploymentStatusBadge } from './EmploymentStatusBadge';
import { cn } from '@/lib/utils';
import type { Teacher } from '@schoolos/types';

interface TeacherCardProps {
  teacher: Teacher;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (teacher: Teacher) => void;
}

export const TeacherCard = ({ teacher, selectable, selected, onToggleSelect }: TeacherCardProps) => {
  const navigate = useNavigate();

  const initials = teacher.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const subjectPreview = teacher.subjects.slice(0, 2).join(', ');
  const extraSubjects  = teacher.subjects.length > 2 ? `+${teacher.subjects.length - 2}` : '';

  return (
    <div
      onClick={selectable ? () => onToggleSelect?.(teacher) : undefined}
      className={cn(
        'bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out p-6 flex flex-col gap-5 relative',
        selectable && 'cursor-pointer',
        selected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-100',
      )}
    >
      {selectable && (
        <div
          className={cn(
            'absolute top-4 right-4 w-5 h-5 rounded-md border flex items-center justify-center',
            selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300',
          )}
        >
          {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </div>
      )}
      {/* Top row: avatar + name + status */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-lg font-bold text-white">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-gray-900 leading-tight truncate">
              {teacher.fullName}
            </h3>
            <EmploymentStatusBadge status={teacher.employmentStatus} />
          </div>
          <p className="text-sm font-semibold text-indigo-600 mt-1">{teacher.employeeId}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 border-t border-gray-50 pt-4">
        {teacher.department && (
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 truncate">{teacher.department}</span>
          </div>
        )}
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-600">{teacher.phone}</span>
        </div>
        {teacher.subjects.length > 0 && (
          <p className="text-xs font-medium text-gray-500 truncate">
            {subjectPreview}{extraSubjects && ` ${extraSubjects}`}
          </p>
        )}
      </div>

      {/* Tags */}
      {teacher.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {teacher.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
          {teacher.tags.length > 4 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              +{teacher.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {!selectable && (
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/teachers/${teacher._id}`)}
            className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                       flex items-center justify-center
                       text-sm font-semibold text-white transition-colors duration-150"
            type="button"
          >
            View Profile
          </button>
          <button
            onClick={() => navigate(`/teachers/${teacher._id}/edit`)}
            className="h-11 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200
                       flex items-center justify-center
                       text-sm font-semibold text-gray-600 transition-colors duration-150"
            type="button"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
