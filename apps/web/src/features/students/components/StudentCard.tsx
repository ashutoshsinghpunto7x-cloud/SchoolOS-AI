import { GraduationCap, Phone, Eye, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import type { Student } from '@schoolos/types';

interface StudentCardProps {
  student: Student;
}

export const StudentCard = ({ student }: StudentCardProps) => {
  const navigate = useNavigate();

  const initials = student.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out p-6 flex flex-col gap-5">
      {/* Top row: avatar + name + status */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-lg font-bold text-white">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-gray-900 leading-tight truncate">
              {student.fullName}
            </h3>
            <StatusBadge status={student.admissionStatus} />
          </div>
          <p className="text-sm font-semibold text-blue-600 mt-1">
            {student.admissionNumber}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 border-t border-gray-50 pt-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
          <span className="text-sm font-medium text-gray-600">
            Class {student.class} — Section {student.section}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
          <span className="text-sm font-medium text-gray-600">{student.parentPhone}</span>
        </div>
      </div>

      {/* Tags */}
      {student.tags && student.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {student.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
          {student.tags.length > 4 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              +{student.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/students/${student._id}`)}
          className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     flex items-center justify-center gap-2
                     text-sm font-semibold text-white transition-colors duration-150"
          type="button"
        >
          <Eye className="w-4 h-4" />
          View Profile
        </button>
        <button
          onClick={() => navigate(`/students/${student._id}/edit`)}
          className="h-11 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200
                     flex items-center justify-center gap-2
                     text-sm font-semibold text-gray-600 transition-colors duration-150"
          type="button"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
